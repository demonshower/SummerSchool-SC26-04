import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { ImportTextDto, ImportLinkDto } from './dto/content.dto';
import { LlmProvider } from '../providers/llm/llm.provider';
import { AmapProvider } from '../providers/amap/amap.provider';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmProvider,
    private readonly amap: AmapProvider,
  ) {}

  /**
   * 导入文本攻略 — 优先 LLM 抽取，失败回退关键词
   */
  async importText(userId: string, dto: ImportTextDto) {
    let extractedPlaces: any[] = [];
    let extractMethod = 'keyword';

    // 尝试从 trip 取目的地作为 city hint
    let cityHint: string | undefined;
    if (dto.tripId) {
      const trip = await this.prisma.trip.findFirst({ where: { id: dto.tripId } });
      cityHint = trip?.destinationCity;
    }

    if (this.llm.isEnabled()) {
      try {
        extractedPlaces = await this.llm.extractPlacesFromGuide(dto.rawText, cityHint);
        extractMethod = 'llm';
        this.logger.log(`LLM extracted ${extractedPlaces.length} places`);
      } catch (e: any) {
        this.logger.warn(`LLM extract failed, fallback keywords: ${e.message}`);
        extractedPlaces = this.extractPlacesFromText(dto.rawText);
      }
    } else {
      extractedPlaces = this.extractPlacesFromText(dto.rawText);
    }

    // 用高德辅助消歧（可选）
    if (this.amap.isEnabled() && cityHint) {
      for (const p of extractedPlaces) {
        if (!p.city) p.city = cityHint;
      }
    }

    const source = await this.prisma.contentSource.create({
      data: {
        userId,
        tripId: dto.tripId,
        sourceType: 'text',
        title: dto.title || `文本攻略 - ${new Date().toLocaleDateString()}`,
        rawText: dto.rawText,
        summary: this.generateSummary(dto.rawText),
        extractedPlaces: extractedPlaces as any,
        status: 'completed',
      },
    });

    for (const place of extractedPlaces) {
      let matchedPoi = await this.prisma.place.findFirst({
        where: {
          OR: [
            { canonicalName: { contains: place.mention } },
            { canonicalName: place.mention },
          ],
        },
      });

      // 本地库未命中时，尝试高德搜索并缓存到 places
      if (!matchedPoi && this.amap.isEnabled()) {
        try {
          const pois = await this.amap.searchPoi(place.mention, place.city || cityHint, undefined, 3);
          const top = pois[0];
          if (top) {
            const loc = this.amap.parseLocation(top.location);
            matchedPoi = await this.prisma.place.create({
              data: {
                canonicalName: top.name,
                category: this.mapAmapTypeToCategory(top.type),
                cityCode: (place.city || cityHint || 'unknown').toLowerCase(),
                cityName: top.cityname || place.city || cityHint || '',
                address: top.address || top.adname || '',
                lat: loc?.lat,
                lng: loc?.lng,
                attributes: {
                  amapId: top.id,
                  type: top.type,
                  source: 'amap',
                },
              },
            });
          }
        } catch (e: any) {
          this.logger.warn(`Amap resolve for ${place.mention} failed: ${e.message}`);
        }
      }

      await this.prisma.placeMention.create({
        data: {
          contentSourceId: source.id,
          placeId: matchedPoi?.id,
          mentionText: place.mention,
          suggestedDurationMin: place.suggestedDurationMinutes,
          suggestedPeriod: place.suggestedPeriod,
          sentiment: place.sentiment,
          confidence: place.confidence,
          resolutionStatus: matchedPoi ? 'confirmed' : 'pending',
          tips: place.tips as any,
          evidenceSpan: place.evidence,
        },
      });
    }

    return {
      id: source.id,
      status: 'completed',
      extractMethod,
      extractedCount: extractedPlaces.length,
      places: extractedPlaces,
    };
  }

  async importLink(userId: string, dto: ImportLinkDto) {
    const source = await this.prisma.contentSource.create({
      data: {
        userId,
        tripId: dto.tripId,
        sourceType: 'link',
        sourceUrl: dto.sourceUrl,
        title: dto.title || dto.sourceUrl,
        status: 'metadata_only',
        summary: '链接已保存，请手动粘贴攻略内容以进行抽取。',
      },
    });

    return {
      id: source.id,
      status: 'metadata_only',
      message: '链接已保存。由于平台限制，无法直接读取正文。请粘贴文本内容。',
    };
  }

  async getExtract(userId: string, sourceId: string) {
    const source = await this.prisma.contentSource.findFirst({
      where: { id: sourceId, userId },
      include: {
        mentions: {
          include: { place: true },
          orderBy: { confidence: 'desc' },
        },
      },
    });
    if (!source) throw BusinessException.notFound('Content', sourceId);
    return source;
  }

  async getTripContentSources(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    return this.prisma.contentSource.findMany({
      where: { userId, tripId },
      orderBy: { importedAt: 'desc' },
      include: {
        _count: { select: { mentions: true } },
      },
    });
  }

  async deleteSource(userId: string, sourceId: string) {
    const source = await this.prisma.contentSource.findFirst({
      where: { id: sourceId, userId },
    });
    if (!source) throw BusinessException.notFound('Content', sourceId);
    await this.prisma.contentSource.delete({ where: { id: sourceId } });
    return { success: true };
  }

  async resolveMention(userId: string, mentionId: string, placeId: string) {
    const mention = await this.prisma.placeMention.findUnique({
      where: { id: mentionId },
      include: { contentSource: true },
    });
    if (!mention || mention.contentSource.userId !== userId) {
      throw BusinessException.notFound('Content', mentionId);
    }

    await this.prisma.placeMention.update({
      where: { id: mentionId },
      data: {
        placeId,
        resolutionStatus: 'confirmed',
        resolvedAt: new Date(),
      },
    });

    return { success: true };
  }

  private mapAmapTypeToCategory(type: string): string {
    if (!type) return 'attraction';
    if (type.includes('餐') || type.includes('美食')) return 'restaurant';
    if (type.includes('酒店') || type.includes('宾馆') || type.includes('住宿')) return 'hotel';
    if (type.includes('车站') || type.includes('机场') || type.includes('地铁')) return 'station';
    if (type.includes('购物') || type.includes('商场')) return 'shopping';
    return 'attraction';
  }

  private extractPlacesFromText(text: string) {
    const knownPlaces = [
      { name: '西湖', duration: 180, period: 'afternoon' },
      { name: '灵隐寺', duration: 120, period: 'morning' },
      { name: '宋城', duration: 240, period: 'afternoon' },
      { name: '外滩', duration: 90, period: 'evening' },
      { name: '故宫', duration: 240, period: 'morning' },
      { name: '长城', duration: 360, period: 'morning' },
      { name: '颐和园', duration: 180, period: 'afternoon' },
      { name: '中山陵', duration: 120, period: 'morning' },
      { name: '夫子庙', duration: 90, period: 'evening' },
      { name: '石林', duration: 240, period: 'morning' },
      { name: '滇池', duration: 120, period: 'afternoon' },
      { name: '翠湖', duration: 60, period: 'morning' },
      { name: '楼外楼', duration: 90, period: 'afternoon' },
      { name: '知味观', duration: 60, period: 'noon' },
      { name: '全聚德', duration: 90, period: 'noon' },
      { name: '南翔馒头店', duration: 60, period: 'noon' },
    ];

    const results: any[] = [];
    for (const p of knownPlaces) {
      if (text.includes(p.name)) {
        const idx = text.indexOf(p.name);
        const context = text.substring(Math.max(0, idx - 30), Math.min(text.length, idx + 50));
        let sentiment = 'positive';
        if (context.includes('不推荐') || context.includes('避坑') || context.includes('不好')) {
          sentiment = 'negative';
        }
        const tips: string[] = [];
        if (context.includes('早上') || context.includes('上午')) tips.push('建议上午前往');
        if (context.includes('排队')) tips.push('可能需要排队');
        if (context.includes('免费')) tips.push('免费景点');
        results.push({
          mention: p.name,
          suggestedDurationMinutes: p.duration,
          suggestedPeriod: p.period,
          sentiment,
          confidence: 0.7 + Math.random() * 0.25,
          tips,
          evidence: context.trim(),
        });
      }
    }
    return results;
  }

  private generateSummary(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= 100) return clean;
    return clean.substring(0, 100) + '...';
  }
}
