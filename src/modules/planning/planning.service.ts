import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { CreatePlanDto } from './dto/planning.dto';
import { AmapProvider } from '../providers/amap/amap.provider';
import { WeatherProvider } from '../providers/weather/weather.provider';
import { LlmProvider } from '../providers/llm/llm.provider';
import { AsyncPlanEngine } from './async-plan.engine';

interface DayAnalysis {
  date: Date;
  dayType: 'departure' | 'meeting_day' | 'return' | 'free';
  freeSlots: { start: Date; end: Date }[];
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amap: AmapProvider,
    private readonly weather: WeatherProvider,
    private readonly llm: LlmProvider,
    private readonly engine: AsyncPlanEngine,
  ) {}

  /**
   * 触发自动规划：立即返回 jobId，后台分段并行执行
   */
  async createPlan(userId: string, tripId: string, dto: CreatePlanDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      include: { meetings: true },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    const job = this.engine.createJob(tripId);
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'planning' },
    });

    // 后台执行，不阻塞 HTTP（可轮询 status）
    void this.runPlanJob(userId, trip, job.jobId, dto).catch((e) => {
      this.logger.error(`background plan failed: ${e.message}`);
    });

    return {
      jobId: job.jobId,
      status: 'queued',
      progress: 0,
      stages: job.stages,
      message: '规划任务已提交，请轮询 /planning/status',
    };
  }

  /** 等待后台任务结束（供 autoPlan 使用） */
  async waitForJob(jobId: string, timeoutMs = 180000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = this.engine.getJob(jobId);
      if (!job) throw new Error('job not found');
      if (job.status === 'completed') return job.result;
      if (job.status === 'failed') throw new Error(job.error || 'planning failed');
      await new Promise((r) => setTimeout(r, 800));
    }
    throw new Error('planning timeout');
  }

  private async runPlanJob(userId: string, trip: any, jobId: string, dto: CreatePlanDto) {
    const job = this.engine.getJob(jobId);
    if (!job) return;
    const tripId = trip.id;

    try {
      const strategy = dto.strategy || 'balanced';
      const dayAnalysis = this.analyzeDays(trip);

      // ===== Stage 1: context (weather) =====
      this.engine.mark(job, 'context', 'running');
      const { weather } = await this.engine.gatherContext(trip.destinationCity);
      this.engine.mark(job, 'context', 'completed', weather ? `${weather.weather} ${weather.temperature}℃` : '无天气数据');

      // ===== Stage 2: candidates in parallel =====
      this.engine.mark(job, 'candidates', 'running');
      const candidates = await this.engine.gatherCandidates(
        trip.destinationCity,
        trip.attractionPreference,
      );
      this.engine.mark(
        job,
        'candidates',
        'completed',
        `酒店${candidates.hotels.length}/景点${candidates.attractions.length}/餐饮${candidates.restaurants.length}`,
      );

      // ===== Stage 3+4: transport & hotel LLM in parallel =====
      this.engine.mark(job, 'transport', 'running');
      this.engine.mark(job, 'hotel', 'running');
      const [transportChoice, hotelChoice] = await Promise.all([
        this.engine.llmChooseTransport(trip, weather),
        this.engine.llmChooseHotel(trip, candidates.hotels, weather),
      ]);
      this.engine.mark(job, 'transport', 'completed', transportChoice.mode);
      this.engine.mark(job, 'hotel', 'completed', hotelChoice.name);

      // ===== Stage 5: per-day LLM in parallel =====
      this.engine.mark(job, 'days', 'running');
      const usedNames: string[] = [];
      // Prepare day payloads
      const dayPayloads = dayAnalysis.map((d) => ({
        date: d.date.toISOString().slice(0, 10),
        dayType: d.dayType,
        freeSlots: d.freeSlots.map((s) => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
        })),
      }));

      // Run all day planners concurrently (each is a separate LLM call)
      const dayPlans = await Promise.all(
        dayPayloads.map((day) =>
          this.engine.llmPlanDay({
            trip,
            day,
            attractions: candidates.attractions,
            restaurants: candidates.restaurants,
            hotelName: hotelChoice.name,
            weather,
            strategy,
            usedNames: [...usedNames],
          }),
        ),
      );
      // collect used names after
      for (const items of dayPlans) {
        for (const it of items) {
          if (it.title) usedNames.push(it.title);
        }
      }
      this.engine.mark(job, 'days', 'completed', `${dayPlans.length} 天并行编排完成`);

      // ===== Stage 6: persist days/items =====
      this.engine.mark(job, 'persist', 'running');
      await this.prisma.tripDay.deleteMany({ where: { tripId } });

      // weather map
      const forecastByDate = new Map<string, string>();
      if (weather?.forecast) {
        for (const f of weather.forecast) {
          if (f.date) {
            forecastByDate.set(
              f.date,
              `${f.dayWeather || ''} ${f.dayTemp || ''}℃`,
            );
          }
        }
      }

      const transportItems = this.buildTransportItems(trip, dayAnalysis, transportChoice);
      const hotelPlaceId = await this.ensurePlace(hotelChoice, trip.destinationCity, 'hotel');

      for (let di = 0; di < dayAnalysis.length; di++) {
        const day = dayAnalysis[di];
        const dateKey = day.date.toISOString().slice(0, 10);
        const weatherSummary =
          forecastByDate.get(dateKey) ||
          (weather ? `${weather.weather} ${weather.temperature}℃` : null);

        const tripDay = await this.prisma.tripDay.create({
          data: {
            tripId,
            localDate: day.date,
            dayType: day.dayType,
            weatherSummary,
          },
        });

        let position = 0;
        // inject transport on first/last day
        for (const t of transportItems.filter(
          (x) => x.dayDate.toISOString().slice(0, 10) === dateKey,
        )) {
          const item = await this.prisma.itineraryItem.create({
            data: {
              tripDayId: tripDay.id,
              kind: 'transport',
              title: t.title,
              subtitle: t.subtitle,
              position: position++,
              startAt: t.startAt,
              endAt: t.endAt,
              locationText: t.locationText,
              costMinor: t.costMinor,
              icon: t.icon,
              isFixed: true,
              sourceType: 'llm_segment',
              status: 'estimated',
            },
          });
          if (t.transport) {
            await this.prisma.transportSegment.create({
              data: {
                itemId: item.id,
                mode: t.transport.mode,
                durationSeconds: t.transport.durationSeconds,
                costMinor: t.transport.costMinor,
              },
            });
          }
        }

        // day LLM items
        for (const it of dayPlans[di] || []) {
          // skip duplicate hotel lines if we add hotel separately for nights
          if (it.kind === 'hotel') continue;
          let placeId: string | null = null;
          if (it.amapId || (it.lat && it.lng)) {
            placeId = await this.ensurePlace(
              {
                name: it.title,
                address: it.address,
                lat: it.lat,
                lng: it.lng,
                amapId: it.amapId,
              },
              trip.destinationCity,
              it.kind === 'meal' ? 'restaurant' : 'attraction',
            );
          }
          const startAt = this.combineDateTime(day.date, it.start);
          const endAt = this.combineDateTime(day.date, it.end);
          await this.prisma.itineraryItem.create({
            data: {
              tripDayId: tripDay.id,
              kind: ['attraction', 'meal', 'meeting', 'commute', 'fixed'].includes(it.kind)
                ? it.kind
                : 'attraction',
              title: it.title,
              subtitle: it.note || null,
              position: position++,
              startAt,
              endAt,
              placeId,
              locationText: it.address || trip.destinationCity,
              costMinor: Math.round((Number(it.priceYuan) || 0) * 100),
              icon:
                it.kind === 'meal'
                  ? 'bi-cup-hot'
                  : it.kind === 'meeting'
                    ? 'bi-people'
                    : 'bi-tree',
              isFixed: it.kind === 'meeting',
              sourceType: 'llm_segment',
              status: 'estimated',
              note: it.note,
            },
          });
        }

        // hotel nights except return day
        if (day.dayType !== 'return') {
          const checkIn = new Date(day.date);
          checkIn.setHours(18, 0, 0, 0);
          await this.prisma.itineraryItem.create({
            data: {
              tripDayId: tripDay.id,
              kind: 'hotel',
              title: `入住 ${hotelChoice.name}`,
              subtitle: hotelChoice.reason || '住宿',
              position: position++,
              startAt: checkIn,
              placeId: hotelPlaceId,
              locationText: hotelChoice.address || trip.destinationCity,
              costMinor: Math.round((hotelChoice.priceYuan || 350) * 100),
              icon: 'bi-building',
              sourceType: 'llm_segment',
              status: 'estimated',
            },
          });
        }
      }
      this.engine.mark(job, 'persist', 'completed');

      // ===== Stage commute =====
      this.engine.mark(job, 'commute', 'running');
      const routeHints = await this.enrichCommuteHints(tripId, trip.destinationCity);
      this.engine.mark(job, 'commute', 'completed', `${routeHints.length} 段通勤`);

      // ===== Stage explain =====
      this.engine.mark(job, 'explain', 'running');
      const explanation = await this.engine.llmExplain(
        trip,
        {
          transport: transportChoice,
          hotel: hotelChoice,
          days: dayPlans,
        },
        weather,
        routeHints,
      );
      this.engine.mark(job, 'explain', 'completed');

      const planVersion = await this.prisma.planVersion.create({
        data: {
          tripId,
          version: trip.version + 1,
          strategy,
          status: 'applied',
          summary:
            explanation?.summary ||
            `分段规划完成：${dayAnalysis.length} 天`,
          evidence: {
            jobId: job.jobId,
            stages: job.stages as any,
            strategy,
            weather: weather as any,
            transportChoice: transportChoice as any,
            hotelChoice: hotelChoice as any,
            explanation: explanation as any,
            routeHints: routeHints as any,
            dataSources: {
              transport: 'llm_estimate',
              hotel: this.amap.isEnabled() ? 'amap+llm' : 'llm',
              attraction: this.amap.isEnabled() ? 'amap+llm' : 'llm',
              weather: weather?.provider || 'none',
              llm: this.llm.isEnabled() ? 'ecnu_segmented' : 'fallback',
              planningMode: 'parallel_segmented_llm',
            },
          } as any,
        },
      });

      await this.prisma.trip.update({
        where: { id: tripId },
        data: { status: 'ready', version: { increment: 1 } },
      });

      const result = {
        jobId: job.jobId,
        status: 'completed' as const,
        progress: 100,
        stages: job.stages,
        planVersion,
        explanation,
        weather,
        routeHints,
        stats: {
          days: dayAnalysis.length,
          transport: transportItems.length,
          hotels: Math.max(dayAnalysis.length - 1, 0),
          activities: dayPlans.reduce((n, d) => n + d.length, 0),
        },
      };
      this.engine.complete(job, result);
      return result;
    } catch (error: any) {
      this.logger.error(`plan failed: ${error.message}`, error.stack);
      this.engine.fail(job, error.message);
      await this.prisma.trip.update({
        where: { id: tripId },
        data: { status: 'draft' },
      });
      throw error;
    }
  }

  async getPlanStatus(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      select: { status: true, version: true },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);
    const job = this.engine.getLatestJobForTrip(tripId);
    return {
      tripStatus: trip.status,
      version: trip.version,
      job: job
        ? {
            jobId: job.jobId,
            status: job.status,
            progress: job.progress,
            stages: job.stages,
            error: job.error,
            updatedAt: job.updatedAt,
          }
        : null,
    };
  }

  async getPlanResult(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      include: {
        meetings: true,
        days: {
          orderBy: { localDate: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' },
              include: { place: true, transportSegment: true },
            },
          },
        },
        planVersions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);
    return trip;
  }

  async applyPlan(userId: string, tripId: string, version: number) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, ownerId: userId } });
    if (!trip) throw BusinessException.notFound('Trip', tripId);
    await this.prisma.planVersion.updateMany({
      where: { tripId, version },
      data: { status: 'applied' },
    });
    return { success: true, version };
  }

  // ---------- helpers ----------

  private analyzeDays(trip: any): DayAnalysis[] {
    const days: DayAnalysis[] = [];
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const dayCount =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      let dayType: DayAnalysis['dayType'] = 'free';
      if (i === 0) dayType = 'departure';
      else if (i === dayCount - 1) dayType = 'return';

      const dayMeetings = (trip.meetings || []).filter((m: any) => {
        const mDate = new Date(m.meetingDate);
        return mDate.toDateString() === date.toDateString();
      });
      if (dayMeetings.length > 0) dayType = 'meeting_day';

      const freeSlots = this.calculateFreeSlots(date, dayMeetings, dayType, trip);
      days.push({ date, dayType, freeSlots });
    }
    return days;
  }

  private calculateFreeSlots(
    date: Date,
    meetings: any[],
    dayType: string,
    trip: any,
  ): { start: Date; end: Date }[] {
    const slots: { start: Date; end: Date }[] = [];
    let dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    let dayEnd = new Date(date);
    dayEnd.setHours(22, 0, 0, 0);

    if (dayType === 'departure') dayStart = new Date(trip.earliestDeparture);
    if (dayType === 'return') {
      dayEnd = new Date(new Date(trip.latestReturn).getTime() - 60 * 60 * 1000);
    }

    if (!meetings.length) {
      if (dayEnd > dayStart) slots.push({ start: dayStart, end: dayEnd });
      return slots;
    }

    const sorted = [...meetings].sort((a, b) => a.startTime.localeCompare(b.startTime));
    let cursor = dayStart;
    for (const m of sorted) {
      const mStart = new Date(date);
      const [sh, sm] = String(m.startTime).split(':').map(Number);
      mStart.setHours(sh, sm || 0, 0, 0);
      const mEnd = new Date(date);
      const [eh, em] = String(m.endTime).split(':').map(Number);
      mEnd.setHours(eh, em || 0, 0, 0);
      if (mStart > cursor && (mStart.getTime() - cursor.getTime()) / 60000 >= 60) {
        slots.push({ start: cursor, end: mStart });
      }
      cursor = mEnd;
    }
    if (dayEnd > cursor && (dayEnd.getTime() - cursor.getTime()) / 60000 >= 60) {
      slots.push({ start: cursor, end: dayEnd });
    }
    return slots;
  }

  private buildTransportItems(trip: any, analysis: DayAnalysis[], choice: any) {
    const items: any[] = [];
    const mode = choice?.mode === 'flight' ? 'flight' : 'train';
    const out = choice?.outbound || {};
    const inn = choice?.inbound || {};
    const departureDay = analysis.find((d) => d.dayType === 'departure');
    const returnDay = analysis.find((d) => d.dayType === 'return');

    if (departureDay) {
      const d = new Date(departureDay.date);
      const sh = Number(out.departHour ?? 14);
      const eh = Number(out.arriveHour ?? 16);
      const startAt = new Date(d);
      startAt.setHours(sh, 0, 0, 0);
      const endAt = new Date(d);
      endAt.setHours(eh, 0, 0, 0);
      items.push({
        dayDate: departureDay.date,
        title: `${trip.originCity} → ${trip.destinationCity}`,
        subtitle: out.label || (mode === 'flight' ? '航班估算' : '高铁估算'),
        startAt,
        endAt,
        costMinor: Math.round((Number(out.priceYuan) || (mode === 'flight' ? 800 : 120)) * 100),
        icon: mode === 'flight' ? 'bi-airplane' : 'bi-train-front',
        locationText: `${trip.originCity} → ${trip.destinationCity}`,
        transport: {
          mode,
          durationSeconds: Math.max(3600, (eh - sh) * 3600),
          costMinor: Math.round((Number(out.priceYuan) || 120) * 100),
        },
      });
    }
    if (returnDay) {
      const d = new Date(returnDay.date);
      const sh = Number(inn.departHour ?? 14);
      const eh = Number(inn.arriveHour ?? 16);
      const startAt = new Date(d);
      startAt.setHours(sh, 0, 0, 0);
      const endAt = new Date(d);
      endAt.setHours(eh, 0, 0, 0);
      items.push({
        dayDate: returnDay.date,
        title: `${trip.destinationCity} → ${trip.originCity}`,
        subtitle: inn.label || (mode === 'flight' ? '航班估算' : '高铁估算'),
        startAt,
        endAt,
        costMinor: Math.round((Number(inn.priceYuan) || (mode === 'flight' ? 800 : 120)) * 100),
        icon: mode === 'flight' ? 'bi-airplane' : 'bi-train-front',
        locationText: `${trip.destinationCity} → ${trip.originCity}`,
        transport: {
          mode,
          durationSeconds: Math.max(3600, (eh - sh) * 3600),
          costMinor: Math.round((Number(inn.priceYuan) || 120) * 100),
        },
      });
    }
    return items;
  }

  private combineDateTime(date: Date, hm: string) {
    const d = new Date(date);
    const [h, m] = String(hm || '09:00').split(':').map(Number);
    d.setHours(h || 9, m || 0, 0, 0);
    return d;
  }

  private async ensurePlace(
    p: { name: string; address?: string; lat?: number; lng?: number; amapId?: string },
    city: string,
    category: string,
  ): Promise<string | null> {
    if (!p?.name) return null;
    const existing = await this.prisma.place.findFirst({
      where: { canonicalName: p.name, cityName: city },
    });
    if (existing) return existing.id;
    const created = await this.prisma.place.create({
      data: {
        canonicalName: p.name,
        category,
        cityCode: city.toLowerCase(),
        cityName: city,
        address: p.address || '',
        lat: p.lat,
        lng: p.lng,
        attributes: { amapId: p.amapId, source: p.amapId ? 'amap' : 'plan' },
      },
    });
    return created.id;
  }

  private async enrichCommuteHints(tripId: string, city: string) {
    if (!this.amap.isEnabled()) return [];
    const days = await this.prisma.tripDay.findMany({
      where: { tripId },
      include: {
        items: { orderBy: { position: 'asc' }, include: { place: true } },
      },
      orderBy: { localDate: 'asc' },
    });
    const hints: any[] = [];
    for (const day of days) {
      const withCoords = day.items.filter((i) => i.place?.lng && i.place?.lat);
      for (let i = 0; i < withCoords.length - 1; i++) {
        const a = withCoords[i];
        const b = withCoords[i + 1];
        try {
          const route = await this.amap.smartRoute(
            `${a.place!.lng},${a.place!.lat}`,
            `${b.place!.lng},${b.place!.lat}`,
            city,
          );
          hints.push({
            dayId: day.id,
            from: a.title,
            to: b.title,
            mode: route.mode,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            summary: route.stepsSummary,
          });
        } catch {
          /* skip */
        }
      }
    }
    return hints;
  }
}
