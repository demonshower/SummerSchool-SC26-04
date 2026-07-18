import { Injectable, Logger } from '@nestjs/common';
import { providerConfig } from '../provider.config';

export type BochaFreshness =
  | 'noLimit'
  | 'oneDay'
  | 'oneWeek'
  | 'oneMonth'
  | 'oneYear'
  | 'YYYY-MM-DD..YYYY-MM-DD'
  | string;

export interface BochaSearchOptions {
  freshness?: BochaFreshness;
  summary?: boolean;
  count?: number;
  /** 可选：站点限定，如 xiaohongshu.com */
  site?: string;
}

export interface BochaWebPage {
  id: string;
  name: string;
  url: string;
  displayUrl?: string;
  snippet?: string;
  summary?: string;
  siteName?: string;
  siteIcon?: string;
  datePublished?: string;
  dateLastCrawled?: string;
  language?: string | null;
}

export interface BochaSearchResult {
  provider: 'bocha';
  query: string;
  originalQuery: string;
  webSearchUrl?: string;
  totalEstimatedMatches?: number;
  pages: BochaWebPage[];
  observedAt: string;
  raw?: any;
}

@Injectable()
export class BochaProvider {
  private readonly logger = new Logger(BochaProvider.name);

  isEnabled(): boolean {
    return providerConfig.bocha.enabled && !!providerConfig.bocha.apiKey;
  }

  /**
   * 中文网页搜索（OpenAPI: POST /web-search）
   */
  async webSearch(query: string, options: BochaSearchOptions = {}): Promise<BochaSearchResult> {
    if (!this.isEnabled()) {
      throw new Error('Bocha search is not configured (BOCHA_API_KEY missing or disabled)');
    }
    if (!query?.trim()) {
      throw new Error('query is required');
    }

    let finalQuery = query.trim();
    if (options.site) {
      finalQuery = `site:${options.site} ${finalQuery}`;
    }

    const body = {
      query: finalQuery,
      freshness: options.freshness || 'oneYear',
      summary: options.summary !== false,
      count: Math.min(Math.max(options.count || 8, 1), 50),
    };

    const { baseUrl, apiKey, timeoutMs } = providerConfig.bocha;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const rawText = await res.text();
      if (!res.ok) {
        this.logger.error(`Bocha HTTP ${res.status}: ${rawText.slice(0, 400)}`);
        throw new Error(`Bocha search failed: HTTP ${res.status}`);
      }

      let payload: any;
      try {
        payload = JSON.parse(rawText);
      } catch {
        throw new Error('Bocha returned invalid JSON');
      }

      // Shape: { code, data: { queryContext, webPages: { value: [...] } } }
      if (payload.code !== undefined && Number(payload.code) !== 200) {
        throw new Error(`Bocha error code=${payload.code} msg=${payload.msg || ''}`);
      }

      const data = payload.data || payload;
      const webPages = data.webPages || {};
      const values: any[] = Array.isArray(webPages.value) ? webPages.value : [];

      const pages: BochaWebPage[] = values.map((v, idx) => ({
        id: v.id || `bocha_${idx}`,
        name: v.name || v.title || '',
        url: v.url || '',
        displayUrl: v.displayUrl,
        snippet: v.snippet || '',
        summary: v.summary || v.snippet || '',
        siteName: v.siteName || this.guessSite(v.url),
        siteIcon: v.siteIcon,
        datePublished: v.datePublished,
        dateLastCrawled: v.dateLastCrawled,
        language: v.language,
      }));

      return {
        provider: 'bocha',
        query: finalQuery,
        originalQuery: data.queryContext?.originalQuery || query,
        webSearchUrl: webPages.webSearchUrl,
        totalEstimatedMatches: webPages.totalEstimatedMatches,
        pages,
        observedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 根据旅行信息生成多组攻略检索词
   */
  buildTravelQueries(input: {
    destinationCity: string;
    originCity?: string;
    days?: number;
    month?: number;
    pace?: string;
    attractionPreference?: string;
    withKids?: boolean;
  }): string[] {
    const city = input.destinationCity;
    const days = input.days && input.days > 0 ? input.days : 3;
    const monthHint = input.month ? `${input.month}月` : '';
    const pref =
      input.attractionPreference && input.attractionPreference !== 'any'
        ? input.attractionPreference
        : '';

    const queries = [
      `${city} ${days}日游 攻略 ${monthHint}`.trim(),
      `${city} 本地美食 餐厅 推荐 避坑`,
      `${city} 酒店 区域 交通 推荐`,
      `${city} 雨天 室内 景点`,
      `${city} 景点 游玩顺序 预约 排队`,
    ];

    if (pref) {
      queries.push(`${city} ${pref} 景点 路线`);
    }
    if (input.pace === 'relaxed') {
      queries.push(`${city} 轻松 慢节奏 行程`);
    }
    if (input.withKids) {
      queries.push(`${city} 亲子 游玩 攻略`);
    }
    // 公开索引的小红书结果（不保证正文）
    queries.push(`site:xiaohongshu.com ${city} 攻略`);

    // 去重
    return [...new Set(queries.filter(Boolean))];
  }

  private guessSite(url?: string): string {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
}
