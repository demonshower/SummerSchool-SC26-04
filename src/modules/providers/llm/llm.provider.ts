import { Injectable, Logger } from '@nestjs/common';
import { providerConfig } from '../provider.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ExtractedPlace {
  mention: string;
  city?: string;
  suggestedDurationMinutes?: number;
  suggestedPeriod?: string;
  sentiment?: string;
  confidence?: number;
  tips?: string[];
  evidence?: string;
}

export interface ParsedTripRequest {
  originCity?: string;
  destinationCity?: string;
  startDate?: string;
  endDate?: string;
  budgetYuan?: number;
  transportPreference?: string;
  pace?: string;
  wantsSightseeing?: boolean;
  attractionPreference?: string;
  hotelMaxPriceYuan?: number;
  meetings?: Array<{
    title?: string;
    meetingDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }>;
  notes?: string[];
  missingFields?: string[];
  ambiguities?: string[];
}

export interface PlanExplanation {
  summary: string;
  advantages: string[];
  disadvantages: string[];
  suitableFor: string[];
  risks: string[];
  assumptions: string[];
}

@Injectable()
export class LlmProvider {
  private readonly logger = new Logger(LlmProvider.name);

  isEnabled(): boolean {
    return providerConfig.llm.enabled && !!providerConfig.llm.apiKey;
  }

  /**
   * OpenAI-compatible chat completions
   */
  async chat(messages: ChatMessage[], options: LlmChatOptions = {}): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('LLM provider is not configured (LLM_API_KEY missing or ENABLE_LLM=false)');
    }

    const { baseUrl, apiKey, model, timeoutMs } = providerConfig.llm;
    // Keep body minimal — some campus gateways reject unknown fields
    const body: Record<string, any> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      stream: false,
    };
    if (options.maxTokens) body.max_tokens = options.maxTokens;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
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
        this.logger.error(`LLM HTTP ${res.status}: ${rawText.slice(0, 500)}`);
        throw new Error(`LLM request failed: HTTP ${res.status} ${rawText.slice(0, 200)}`);
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`LLM invalid JSON response: ${rawText.slice(0, 200)}`);
      }
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        this.logger.error(`LLM empty content: ${rawText.slice(0, 300)}`);
        throw new Error('LLM returned empty content');
      }
      return content.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 从攻略文本抽取地点（结构化 JSON）
   */
  async extractPlacesFromGuide(rawText: string, cityHint?: string): Promise<ExtractedPlace[]> {
    // Single user message works more reliably on campus gateways
    const prompt = `从下面旅行攻略中提取所有景点、餐厅、酒店名称。
目的地城市提示：${cityHint || '未知'}

要求：
1. 只提取文中明确出现的地点名
2. 严格输出 JSON，不要其它说明，不要代码块
3. 格式：{"places":[{"mention":"地点名","city":"${cityHint || ''}","suggestedDurationMinutes":90,"suggestedPeriod":"afternoon","sentiment":"positive","confidence":0.9,"tips":[],"evidence":"原文短句"}]}

攻略：
${rawText.slice(0, 6000)}`;

    try {
      const content = await this.chat(
        [{ role: 'user', content: prompt }],
        { temperature: 0.2, maxTokens: 2048 },
      );
      this.logger.debug(`extract raw: ${content.slice(0, 500)}`);
      const parsed = this.safeParseJson(content);
      // tolerate places / 地点 / items
      let places = parsed?.places ?? parsed?.地点 ?? parsed?.items ?? parsed;
      if (!Array.isArray(places) && parsed && typeof parsed === 'object') {
        // single object wrapper
        const vals = Object.values(parsed);
        const arr = vals.find((v) => Array.isArray(v));
        places = arr || [];
      }
      if (!Array.isArray(places)) places = [];
      const mapped = places
        .filter((p: any) => p && (p.mention || p.name || p.地点 || p.title))
        .map((p: any) => ({
          mention: String(p.mention || p.name || p.地点 || p.title).trim(),
          city: p.city || p.城市 ? String(p.city || p.城市) : undefined,
          suggestedDurationMinutes:
            Number(p.suggestedDurationMinutes || p.duration || p.建议时长) || 90,
          suggestedPeriod: p.suggestedPeriod || p.period || 'anytime',
          sentiment: p.sentiment || p.情感 || 'positive',
          confidence: Math.min(1, Math.max(0, Number(p.confidence ?? p.置信度) || 0.7)),
          tips: Array.isArray(p.tips) ? p.tips.map(String) : [],
          evidence: p.evidence || p.证据 ? String(p.evidence || p.证据).slice(0, 200) : undefined,
        }));
      this.logger.log(`extractPlaces mapped=${mapped.length}`);
      return mapped;
    } catch (e: any) {
      this.logger.warn(`extractPlacesFromGuide failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * 自然语言行程需求解析
   */
  async parseTripRequest(text: string): Promise<ParsedTripRequest> {
    const system = `你是出差/旅行需求解析助手。把用户中文描述解析为结构化 JSON，不要编造用户未提到的硬事实。
输出 JSON：
{
  "originCity": "出发城市或null",
  "destinationCity": "目的城市或null",
  "startDate": "YYYY-MM-DD或null",
  "endDate": "YYYY-MM-DD或null",
  "budgetYuan": 数字或null,
  "transportPreference": "any|train|flight或null",
  "pace": "relaxed|balanced|intense或null",
  "wantsSightseeing": true/false/null,
  "attractionPreference": "any|自然|人文|商业|美食或null",
  "hotelMaxPriceYuan": 数字或null,
  "meetings": [{"title":"","meetingDate":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","location":""}],
  "notes": ["其它偏好"],
  "missingFields": ["缺失关键字段"],
  "ambiguities": ["歧义说明"]
}`;

    const content = await this.chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      { temperature: 0.2 },
    );
    return this.safeParseJson(content) as ParsedTripRequest;
  }

  /**
   * 基于结构化证据生成方案解释（禁止编造价格/车次）
   */
  async explainPlan(evidence: Record<string, any>): Promise<PlanExplanation> {
    const system = `你是旅行方案解释助手。只能根据提供的 JSON 证据说话，禁止编造价格、车次、航班、营业时间。
输出 JSON：
{
  "summary": "一句话摘要",
  "advantages": ["优点"],
  "disadvantages": ["缺点"],
  "suitableFor": ["适用人群"],
  "risks": ["风险"],
  "assumptions": ["假设"]
}`;

    const content = await this.chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(evidence).slice(0, 8000) },
      ],
      { temperature: 0.4 },
    );
    const parsed = this.safeParseJson(content);
    return {
      summary: parsed?.summary || '方案说明生成完成',
      advantages: Array.isArray(parsed?.advantages) ? parsed.advantages : [],
      disadvantages: Array.isArray(parsed?.disadvantages) ? parsed.disadvantages : [],
      suitableFor: Array.isArray(parsed?.suitableFor) ? parsed.suitableFor : [],
      risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
      assumptions: Array.isArray(parsed?.assumptions) ? parsed.assumptions : [],
    };
  }

  private safeParseJson(text: string): any {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          /* fallthrough */
        }
      }
      this.logger.warn(`Failed to parse LLM JSON: ${text.slice(0, 300)}`);
      return {};
    }
  }
}
