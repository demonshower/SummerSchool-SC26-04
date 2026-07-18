import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { ImportTextDto, ImportLinkDto } from './dto/content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 导入文本攻略
   */
  async importText(userId: string, dto: ImportTextDto) {
    // 简单的关键词抽取（V1 规则版，V2 接入 LLM）
    const extractedPlaces = this.extractPlacesFromText(dto.rawText);

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

    // 创建地点提及
    for (const place of extractedPlaces) {
      // 尝试匹配已有 POI
      const matchedPoi = await this.prisma.place.findFirst({
        where: {
          canonicalName: { contains: place.mention },
        },
      });

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
        },
      });
    }

    return {
      id: source.id,
      status: 'completed',
      extractedCount: extractedPlaces.length,
      places: extractedPlaces,
    };
  }

  /**
   * 导入链接
   */
  async importLink(userId: string, dto: ImportLinkDto) {
    // V1: 只保存链接元数据，不抓取正文
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

  /**
   * 获取攻略抽取结果
   */
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

  /**
   * 获取行程关联攻略
   */
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

  /**
   * 删除攻略
   */
  async deleteSource(userId: string, sourceId: string) {
    const source = await this.prisma.contentSource.findFirst({
      where: { id: sourceId, userId },
    });
    if (!source) throw BusinessException.notFound('Content', sourceId);

    await this.prisma.contentSource.delete({ where: { id: sourceId } });
    return { success: true };
  }

  /**
   * 确认地点映射
   */
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

  // ===== 简单关键词抽取 (V1 规则版) =====

  private extractPlacesFromText(text: string) {
    // 已知地点关键词库
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
        // 查找上下文
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
    // 简单截取前100字作为摘要
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= 100) return clean;
    return clean.substring(0, 100) + '...';
  }
}
