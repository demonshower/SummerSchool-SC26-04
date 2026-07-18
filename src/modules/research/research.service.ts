import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { BochaProvider, BochaWebPage } from '../providers/search/bocha.provider';
import { LlmProvider } from '../providers/llm/llm.provider';
import { AmapProvider } from '../providers/amap/amap.provider';
import { TripResearchDto, WebSearchDto } from './dto/research.dto';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bocha: BochaProvider,
    private readonly llm: LlmProvider,
    private readonly amap: AmapProvider,
  ) {}

  /**
   * 通用网页搜索（调试/工具）
   */
  async searchWeb(dto: WebSearchDto) {
    if (!this.bocha.isEnabled()) {
      throw new Error('Bocha web research is not enabled');
    }
    return this.bocha.webSearch(dto.query, {
      freshness: dto.freshness,
      summary: dto.summary,
      count: dto.count,
      site: dto.site,
    });
  }

  /**
   * 针对某次旅行的攻略研究：多查询搜索 + 可选 LLM 抽取 + 持久化
   */
  async researchTrip(userId: string, tripId: string, dto: TripResearchDto = {}) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    if (!this.bocha.isEnabled()) {
      throw new Error('Bocha web research is not enabled (set BOCHA_API_KEY and ENABLE_WEB_RESEARCH)');
    }

    const days =
      Math.max(
        1,
        Math.ceil(
          (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
            (24 * 3600 * 1000),
        ) + 1,
      ) || 3;

    const autoQueries = this.bocha.buildTravelQueries({
      destinationCity: trip.destinationCity,
      originCity: trip.originCity,
      days,
      month: new Date(trip.startDate).getMonth() + 1,
      pace: trip.pace,
      attractionPreference: trip.attractionPreference,
    });

    const maxQueries = dto.maxQueries ?? 4;
    const queries = (dto.queries?.length ? dto.queries : autoQueries).slice(0, maxQueries);
    const countPerQuery = dto.countPerQuery ?? 5;
    const extractInsights = dto.extractInsights !== false;
    const persist = dto.persist !== false;

    const searchResults: any[] = [];
    const allPages: BochaWebPage[] = [];
    const seenUrls = new Set<string>();

    for (const q of queries) {
      try {
        const result = await this.bocha.webSearch(q, {
          freshness: dto.freshness || 'oneYear',
          summary: true,
          count: countPerQuery,
        });
        const uniquePages = result.pages.filter((p) => {
          if (!p.url || seenUrls.has(p.url)) return false;
          seenUrls.add(p.url);
          return true;
        });
        searchResults.push({
          query: q,
          totalEstimatedMatches: result.totalEstimatedMatches,
          webSearchUrl: result.webSearchUrl,
          pageCount: uniquePages.length,
          pages: uniquePages,
        });
        allPages.push(...uniquePages);
      } catch (e: any) {
        this.logger.warn(`search failed query="${q}": ${e.message}`);
        searchResults.push({ query: q, error: e.message, pages: [] });
      }
    }

    // 合并摘要文本供 LLM 抽取（失败则关键词回退）
    let insights: any = null;
    let extractedPlaces: any[] = [];
    let extractMethod: string | null = null;
    if (extractInsights && allPages.length > 0) {
      const corpus = allPages
        .slice(0, 12)
        .map(
          (p, i) =>
            `来源${i + 1} ${p.siteName || ''} ${p.name}\n${(p.summary || p.snippet || p.name || '').slice(0, 500)}`,
        )
        .join('\n\n');

      if (this.llm.isEnabled()) {
        try {
          extractedPlaces = await this.llm.extractPlacesFromGuide(
            corpus,
            trip.destinationCity,
          );
          extractMethod = 'llm';
        } catch (e: any) {
          this.logger.warn(`insight extract failed: ${e.message}`);
        }
      }
      if (!extractedPlaces.length) {
        extractedPlaces = this.keywordExtract(corpus);
        extractMethod = extractMethod ? `${extractMethod}+keyword` : 'keyword';
      }
      insights = {
        extractMethod,
        placeCount: extractedPlaces.length,
        places: extractedPlaces,
        sourceCount: allPages.length,
      };
    }

    // 可选：高德消歧前几条地点
    if (this.amap.isEnabled() && extractedPlaces.length) {
      for (const place of extractedPlaces.slice(0, 8)) {
        try {
          const pois = await this.amap.searchPoi(
            place.mention,
            trip.destinationCity,
            undefined,
            1,
          );
          if (pois[0]) {
            place.resolvedAmap = {
              name: pois[0].name,
              address: pois[0].address,
              location: pois[0].location,
              amapId: pois[0].id,
            };
          }
        } catch {
          /* ignore */
        }
      }
    }

    let contentSourceId: string | null = null;
    if (persist) {
      const source = await this.prisma.contentSource.create({
        data: {
          userId,
          tripId,
          sourceType: 'web_research',
          title: `${trip.destinationCity} 攻略研究 ${new Date().toISOString().slice(0, 10)}`,
          summary: `博查检索 ${queries.length} 组，命中 ${allPages.length} 条来源`,
          extractedPlaces: {
            queries,
            pages: allPages.map((p) => ({
              name: p.name,
              url: p.url,
              siteName: p.siteName,
              snippet: p.snippet,
              summary: p.summary,
              datePublished: p.datePublished,
            })),
            insights: extractedPlaces,
          } as any,
          status: 'completed',
        },
      });
      contentSourceId = source.id;

      for (const place of extractedPlaces) {
        let matchedPoi = await this.prisma.place.findFirst({
          where: { canonicalName: { contains: place.mention } },
        });
        if (!matchedPoi && place.resolvedAmap?.location) {
          const [lng, lat] = String(place.resolvedAmap.location)
            .split(',')
            .map(Number);
          matchedPoi = await this.prisma.place.create({
            data: {
              canonicalName: place.resolvedAmap.name || place.mention,
              category: 'attraction',
              cityCode: trip.destinationCity.toLowerCase(),
              cityName: trip.destinationCity,
              address: place.resolvedAmap.address || '',
              lat: Number.isNaN(lat) ? null : lat,
              lng: Number.isNaN(lng) ? null : lng,
              attributes: {
                amapId: place.resolvedAmap.amapId,
                source: 'amap+research',
              },
            },
          });
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
    }

    return {
      tripId,
      provider: 'bocha',
      queries,
      totalSources: allPages.length,
      searchResults,
      sources: allPages,
      insights,
      contentSourceId,
      observedAt: new Date().toISOString(),
    };
  }

  /** 关键词回退：从攻略摘要中命中常见景点/餐饮 */
  private keywordExtract(text: string) {
    const known = [
      { name: '西湖', duration: 180, period: 'afternoon' },
      { name: '断桥', duration: 60, period: 'morning' },
      { name: '苏堤', duration: 90, period: 'evening' },
      { name: '雷峰塔', duration: 90, period: 'afternoon' },
      { name: '灵隐寺', duration: 120, period: 'morning' },
      { name: '飞来峰', duration: 60, period: 'morning' },
      { name: '西溪湿地', duration: 150, period: 'afternoon' },
      { name: '宋城', duration: 180, period: 'afternoon' },
      { name: '河坊街', duration: 90, period: 'evening' },
      { name: '钱江新城', duration: 60, period: 'evening' },
      { name: '拱宸桥', duration: 60, period: 'morning' },
      { name: '楼外楼', duration: 90, period: 'noon' },
      { name: '知味观', duration: 60, period: 'noon' },
      { name: '外滩', duration: 90, period: 'evening' },
      { name: '故宫', duration: 180, period: 'morning' },
    ];
    const results: any[] = [];
    for (const k of known) {
      if (text.includes(k.name)) {
        results.push({
          mention: k.name,
          suggestedDurationMinutes: k.duration,
          suggestedPeriod: k.period,
          sentiment: 'positive',
          confidence: 0.65,
          tips: [],
          evidence: k.name,
        });
      }
    }
    return results;
  }

  /**
   * 列出行程已持久化的研究来源
   */
  async listTripResearchSources(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    return this.prisma.contentSource.findMany({
      where: {
        userId,
        tripId,
        sourceType: { in: ['web_research', 'text', 'link'] },
      },
      orderBy: { importedAt: 'desc' },
      include: {
        _count: { select: { mentions: true } },
      },
    });
  }

  /**
   * 从已保存的研究中汇总 insights（地点提及）
   */
  async getTripInsights(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    const sources = await this.prisma.contentSource.findMany({
      where: { userId, tripId },
      include: {
        mentions: { include: { place: true }, orderBy: { confidence: 'desc' } },
      },
      orderBy: { importedAt: 'desc' },
    });

    const mentions = sources.flatMap((s) =>
      s.mentions.map((m) => ({
        ...m,
        sourceId: s.id,
        sourceTitle: s.title,
        sourceType: s.sourceType,
      })),
    );

    // 去重地点名
    const byName = new Map<string, any>();
    for (const m of mentions) {
      const key = m.mentionText;
      const prev = byName.get(key);
      if (!prev || (m.confidence || 0) > (prev.confidence || 0)) {
        byName.set(key, m);
      }
    }

    const webSources = sources
      .filter((s) => s.sourceType === 'web_research')
      .map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        importedAt: s.importedAt,
        pageCount: Array.isArray((s.extractedPlaces as any)?.pages)
          ? (s.extractedPlaces as any).pages.length
          : 0,
      }));

    return {
      tripId,
      destinationCity: trip.destinationCity,
      sourceCount: sources.length,
      webResearchRuns: webSources,
      uniquePlaces: [...byName.values()],
      allMentions: mentions,
    };
  }
}
