import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from '../providers/llm/llm.provider';
import { AmapProvider } from '../providers/amap/amap.provider';
import { WeatherProvider } from '../providers/weather/weather.provider';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PlanStage {
  key: string;
  label: string;
  status: StageStatus;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface PlanJobState {
  jobId: string;
  tripId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  stages: PlanStage[];
  error?: string;
  result?: any;
  updatedAt: string;
}

@Injectable()
export class AsyncPlanEngine {
  private readonly logger = new Logger(AsyncPlanEngine.name);
  private readonly jobs = new Map<string, PlanJobState>();

  constructor(
    private readonly llm: LlmProvider,
    private readonly amap: AmapProvider,
    private readonly weather: WeatherProvider,
  ) {}

  getJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  getLatestJobForTrip(tripId: string) {
    let latest: PlanJobState | null = null;
    for (const j of this.jobs.values()) {
      if (j.tripId === tripId) {
        if (!latest || j.updatedAt > latest.updatedAt) latest = j;
      }
    }
    return latest;
  }

  createJob(tripId: string): PlanJobState {
    const jobId = `plan_${tripId}_${Date.now()}`;
    const stages: PlanStage[] = [
      { key: 'context', label: '采集天气与上下文', status: 'pending' },
      { key: 'candidates', label: '并行检索酒店/景点/餐饮', status: 'pending' },
      { key: 'transport', label: 'LLM 选择城际交通', status: 'pending' },
      { key: 'hotel', label: 'LLM 选择酒店', status: 'pending' },
      { key: 'days', label: '并行 LLM 编排每日行程', status: 'pending' },
      { key: 'commute', label: '高德通勤校验', status: 'pending' },
      { key: 'explain', label: 'LLM 方案解释', status: 'pending' },
      { key: 'persist', label: '写入日程', status: 'pending' },
    ];
    const job: PlanJobState = {
      jobId,
      tripId,
      status: 'queued',
      progress: 0,
      stages,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  private touch(job: PlanJobState) {
    job.updatedAt = new Date().toISOString();
    const done = job.stages.filter((s) => s.status === 'completed' || s.status === 'skipped').length;
    job.progress = Math.round((done / job.stages.length) * 100);
  }

  mark(job: PlanJobState, key: string, status: StageStatus, message?: string) {
    const stage = job.stages.find((s) => s.key === key);
    if (!stage) return;
    stage.status = status;
    if (message) stage.message = message;
    if (status === 'running') stage.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      stage.finishedAt = new Date().toISOString();
    }
    job.status = 'running';
    this.touch(job);
  }

  complete(job: PlanJobState, result: any) {
    job.status = 'completed';
    job.result = result;
    job.progress = 100;
    this.touch(job);
  }

  fail(job: PlanJobState, error: string) {
    job.status = 'failed';
    job.error = error;
    this.touch(job);
  }

  // ---------- Parallel fact gathering ----------

  async gatherContext(destinationCity: string) {
    const weather = await this.weather.getWeather(destinationCity).catch(() => null);
    return { weather };
  }

  async gatherCandidates(destinationCity: string, attractionPreference?: string) {
    const hotelKw =
      attractionPreference && attractionPreference !== 'any'
        ? `${attractionPreference} 附近酒店`
        : '商务酒店';
    const attrKw =
      attractionPreference && attractionPreference !== 'any' ? attractionPreference : '景点';

    const [hotels, attractions, restaurants] = await Promise.all([
      this.safePoi(hotelKw, destinationCity, '100000', 8),
      this.safePoi(attrKw, destinationCity, '110000', 12),
      this.safePoi('美食 餐厅', destinationCity, '050000', 10),
    ]);

    return { hotels, attractions, restaurants };
  }

  private async safePoi(q: string, city: string, types?: string, limit = 8) {
    if (!this.amap.isEnabled()) return [] as any[];
    try {
      const pois = await this.amap.searchPoi(q, city, types, limit);
      return pois.map((p) => {
        const loc = this.amap.parseLocation(p.location);
        return {
          name: p.name,
          address: p.address || p.adname || '',
          lat: loc?.lat,
          lng: loc?.lng,
          amapId: p.id,
          type: p.type,
          location: p.location,
        };
      });
    } catch (e: any) {
      this.logger.warn(`poi ${q} failed: ${e.message}`);
      return [];
    }
  }

  // ---------- Segmented LLM calls (not one big dump) ----------

  async llmChooseTransport(trip: any, weather: any): Promise<any> {
    if (!this.llm.isEnabled()) {
      return this.fallbackTransport(trip);
    }
    const prompt = `你是交通顾问。根据旅行需求，在「火车/高铁」与「飞机」中选一种城际往返方式，并给出粗略时段与费用估算（元，可估算）。
只输出 JSON：
{"mode":"train|flight","outbound":{"departHour":14,"arriveHour":16,"priceYuan":120,"label":"说明"},"inbound":{"departHour":14,"arriveHour":16,"priceYuan":120,"label":"说明"},"reason":"一句话"}

需求：
出发地:${trip.originCity} 目的地:${trip.destinationCity}
偏好:${trip.transportPreference || 'any'} 节奏:${trip.pace}
预算分:${trip.budgetMinor} 天气:${weather?.weather || '未知'}
注意：无法验真票价时标明估算。`;

    try {
      const text = await this.llm.chat([{ role: 'user', content: prompt }], { temperature: 0.3 });
      const parsed = this.parseJson(text);
      if (parsed?.mode) return parsed;
    } catch (e: any) {
      this.logger.warn(`llm transport failed: ${e.message}`);
    }
    return this.fallbackTransport(trip);
  }

  async llmChooseHotel(trip: any, hotelCandidates: any[], weather: any): Promise<any> {
    const list = hotelCandidates.slice(0, 8);
    if (!list.length) {
      return {
        name: `${trip.destinationCity}商务酒店`,
        priceYuan: Math.min(trip.hotelMaxPriceMinor / 100, 350),
        address: trip.destinationCity,
        reason: '无候选时占位',
      };
    }
    if (!this.llm.isEnabled()) {
      return {
        name: list[0].name,
        priceYuan: Math.min(trip.hotelMaxPriceMinor / 100, 350),
        address: list[0].address,
        lat: list[0].lat,
        lng: list[0].lng,
        amapId: list[0].amapId,
        reason: '取检索第一家',
      };
    }
    const prompt = `从候选酒店中选 1 家适合出差的，预算上限约 ${trip.hotelMaxPriceMinor / 100} 元/晚。
只输出 JSON：
{"index":0,"name":"","priceYuan":300,"reason":"一句话"}

候选：
${list.map((h, i) => `${i}. ${h.name} | ${h.address}`).join('\n')}
城市:${trip.destinationCity} 天气:${weather?.weather || '未知'}`;

    try {
      const text = await this.llm.chat([{ role: 'user', content: prompt }], { temperature: 0.2 });
      const parsed = this.parseJson(text);
      const idx = Math.min(Math.max(Number(parsed?.index) || 0, 0), list.length - 1);
      const h = list[idx];
      return {
        name: parsed?.name || h.name,
        priceYuan: Number(parsed?.priceYuan) || Math.min(trip.hotelMaxPriceMinor / 100, 350),
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        amapId: h.amapId,
        reason: parsed?.reason,
      };
    } catch (e: any) {
      this.logger.warn(`llm hotel failed: ${e.message}`);
      const h = list[0];
      return {
        name: h.name,
        priceYuan: Math.min(trip.hotelMaxPriceMinor / 100, 350),
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        amapId: h.amapId,
      };
    }
  }

  /**
   * 单日行程编排（每个 day 单独一次 LLM 调用，可并行）
   */
  async llmPlanDay(params: {
    trip: any;
    day: { date: string; dayType: string; freeSlots: { start: string; end: string }[] };
    attractions: any[];
    restaurants: any[];
    hotelName?: string;
    weather?: any;
    strategy?: string;
    usedNames: string[];
  }): Promise<any[]> {
    const { trip, day, attractions, restaurants, hotelName, weather, strategy, usedNames } = params;
    const attrList = attractions.slice(0, 10);
    const restList = restaurants.slice(0, 8);

    if (!this.llm.isEnabled()) {
      return this.fallbackDayItems(day, attrList, restList, hotelName, trip, usedNames);
    }

    const prompt = `为单日出差日编排 2~4 个活动（JSON 数组），不要输出整天以外内容。
只输出 JSON：
{"items":[{"kind":"attraction|meal|meeting|hotel|commute","title":"","start":"HH:mm","end":"HH:mm","priceYuan":0,"note":"","candidateIndex":0,"candidateType":"attraction|restaurant|none"}]}

规则：
- 必须避开会议占用时段（若 dayType=meeting_day，默认 09:00-12:00 可能有会）
- 优先使用候选列表里的名称（candidateIndex）
- 不要重复 usedNames 中的地点
- 出发日/返程日活动少一些
- 费用估算即可

行程偏好: pace=${trip.pace} strategy=${strategy || 'balanced'} sightseeing=${trip.wantsSightseeing}
城市:${trip.destinationCity} 日期:${day.date} dayType:${day.dayType}
空闲段:${JSON.stringify(day.freeSlots)}
天气:${weather?.weather || '未知'}
已用地点:${usedNames.join(',') || '无'}
景点候选:
${attrList.map((a, i) => `${i}. ${a.name} | ${a.address}`).join('\n') || '无'}
餐厅候选:
${restList.map((a, i) => `${i}. ${a.name} | ${a.address}`).join('\n') || '无'}
酒店:${hotelName || '未定'}`;

    try {
      const text = await this.llm.chat([{ role: 'user', content: prompt }], {
        temperature: 0.35,
        maxTokens: 1200,
      });
      const parsed = this.parseJson(text);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      if (!items.length) {
        return this.fallbackDayItems(day, attrList, restList, hotelName, trip, usedNames);
      }
      return items.map((it: any) => {
        let title = it.title;
        let lat: number | undefined;
        let lng: number | undefined;
        let address = '';
        let amapId: string | undefined;
        if (it.candidateType === 'attraction' && attrList[it.candidateIndex]) {
          const c = attrList[it.candidateIndex];
          title = c.name;
          lat = c.lat;
          lng = c.lng;
          address = c.address;
          amapId = c.amapId;
        }
        if (it.candidateType === 'restaurant' && restList[it.candidateIndex]) {
          const c = restList[it.candidateIndex];
          title = c.name;
          lat = c.lat;
          lng = c.lng;
          address = c.address;
          amapId = c.amapId;
        }
        return {
          kind: it.kind || 'attraction',
          title: title || '活动',
          start: it.start || '14:00',
          end: it.end || '16:00',
          priceYuan: Number(it.priceYuan) || 0,
          note: it.note || '',
          lat,
          lng,
          address,
          amapId,
        };
      });
    } catch (e: any) {
      this.logger.warn(`llm day ${day.date} failed: ${e.message}`);
      return this.fallbackDayItems(day, attrList, restList, hotelName, trip, usedNames);
    }
  }

  async llmExplain(trip: any, assembled: any, weather: any, routeHints: any[]) {
    if (!this.llm.isEnabled()) {
      return {
        summary: `${trip.originCity}→${trip.destinationCity} 行程已生成`,
        advantages: ['已结合外部数据候选'],
        disadvantages: ['城际票价可能为估算'],
        suitableFor: ['出差短途'],
        risks: [],
        assumptions: [],
      };
    }
    return this.llm.explainPlan({
      trip: {
        originCity: trip.originCity,
        destinationCity: trip.destinationCity,
        budgetMinor: trip.budgetMinor,
        pace: trip.pace,
        transportPreference: trip.transportPreference,
      },
      weather,
      assembled,
      routeHints,
      notes: ['分段 LLM 规划；票价可能为估算；POI 来自高德'],
    });
  }

  // ---------- fallbacks (minimal, only when LLM down) ----------

  private fallbackTransport(trip: any) {
    const preferFlight = trip.transportPreference === 'flight';
    return {
      mode: preferFlight ? 'flight' : 'train',
      outbound: {
        departHour: preferFlight ? 10 : 14,
        arriveHour: preferFlight ? 12 : 16,
        priceYuan: preferFlight ? 800 : 120,
        label: preferFlight ? '航班估算' : '高铁估算',
      },
      inbound: {
        departHour: preferFlight ? 15 : 14,
        arriveHour: preferFlight ? 17 : 16,
        priceYuan: preferFlight ? 800 : 120,
        label: preferFlight ? '航班估算' : '高铁估算',
      },
      reason: 'LLM 不可用时的保守默认',
    };
  }

  private fallbackDayItems(
    day: any,
    attractions: any[],
    restaurants: any[],
    hotelName: string | undefined,
    trip: any,
    usedNames: string[],
  ) {
    const items: any[] = [];
    if (day.dayType === 'meeting_day') {
      items.push({
        kind: 'meeting',
        title: '会议（固定）',
        start: '09:00',
        end: '12:00',
        priceYuan: 0,
        note: '固定事项',
      });
    }
    const freeAttr = attractions.find((a) => !usedNames.includes(a.name));
    if (trip.wantsSightseeing && freeAttr && day.dayType !== 'return') {
      items.push({
        kind: 'attraction',
        title: freeAttr.name,
        start: day.dayType === 'meeting_day' ? '14:00' : '10:00',
        end: day.dayType === 'meeting_day' ? '17:00' : '12:00',
        priceYuan: 0,
        address: freeAttr.address,
        lat: freeAttr.lat,
        lng: freeAttr.lng,
        amapId: freeAttr.amapId,
      });
    }
    const freeRest = restaurants.find((a) => !usedNames.includes(a.name));
    if (freeRest) {
      items.push({
        kind: 'meal',
        title: freeRest.name,
        start: '12:00',
        end: '13:00',
        priceYuan: 60,
        address: freeRest.address,
        lat: freeRest.lat,
        lng: freeRest.lng,
        amapId: freeRest.amapId,
      });
    }
    if (hotelName && day.dayType !== 'return') {
      items.push({
        kind: 'hotel',
        title: `入住 ${hotelName}`,
        start: '18:00',
        end: '19:00',
        priceYuan: Math.min(trip.hotelMaxPriceMinor / 100, 350),
      });
    }
    return items;
  }

  parseJson(text: string): any {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
      return {};
    }
  }
}
