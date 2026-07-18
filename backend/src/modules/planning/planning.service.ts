import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common';
import { CreatePlanDto } from './dto/planning.dto';

interface DayAnalysis {
  date: Date;
  dayType: 'departure' | 'meeting_day' | 'return' | 'free';
  freeSlots: { start: Date; end: Date }[];
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 触发自动规划
   */
  async createPlan(userId: string, tripId: string, dto: CreatePlanDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      include: {
        meetings: true,
        days: { include: { items: true } },
      },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    // 更新状态
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'planning' },
    });

    try {
      // 1. 分析每天类型
      const dayAnalysis = this.analyzeDays(trip);

      // 2. 创建/更新日程天
      await this.syncTripDays(tripId, dayAnalysis);

      // 3. 生成交通推荐
      const transportItems = await this.generateTransport(trip, dayAnalysis);

      // 4. 生成酒店推荐
      const hotelItems = await this.generateHotels(trip, dayAnalysis);

      // 5. 生成景点/餐饮推荐
      const activityItems = trip.wantsSightseeing
        ? await this.generateActivities(trip, dayAnalysis, dto.strategy || 'balanced')
        : [];

      // 6. 将所有项目写入数据库
      await this.writeItineraryItems(tripId, dayAnalysis, [
        ...transportItems,
        ...hotelItems,
        ...activityItems,
      ]);

      // 7. 生成规划版本
      const planVersion = await this.prisma.planVersion.create({
        data: {
          tripId,
          version: trip.version + 1,
          strategy: dto.strategy || 'balanced',
          status: 'applied',
          summary: `自动生成行程：${dayAnalysis.length}天，${transportItems.length}交通 + ${hotelItems.length}酒店 + ${activityItems.length}活动`,
          evidence: {
            dayTypes: dayAnalysis.map((d) => ({ date: d.date, type: d.dayType })),
            strategy: dto.strategy,
          },
        },
      });

      // 8. 更新 trip 状态
      await this.prisma.trip.update({
        where: { id: tripId },
        data: {
          status: 'ready',
          version: { increment: 1 },
        },
      });

      return {
        jobId: `plan_${tripId}_${Date.now()}`,
        status: 'completed',
        planVersion,
        stats: {
          days: dayAnalysis.length,
          transport: transportItems.length,
          hotels: hotelItems.length,
          activities: activityItems.length,
        },
      };
    } catch (error) {
      await this.prisma.trip.update({
        where: { id: tripId },
        data: { status: 'draft' },
      });
      throw error;
    }
  }

  /**
   * 获取规划状态
   */
  async getPlanStatus(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      select: { status: true, version: true },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    return { status: trip.status, version: trip.version };
  }

  /**
   * 获取规划结果
   */
  async getPlanResult(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      include: {
        days: {
          orderBy: { localDate: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' },
              include: { place: true, transportSegment: true },
            },
          },
        },
        planVersions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    return trip;
  }

  /**
   * 应用某个规划版本
   */
  async applyPlan(userId: string, tripId: string, version: number) {
    const planVersion = await this.prisma.planVersion.findFirst({
      where: { tripId, version, trip: { ownerId: userId } },
    });
    if (!planVersion) throw BusinessException.notFound('Plan');

    await this.prisma.planVersion.updateMany({
      where: { tripId },
      data: { status: 'superseded' },
    });
    await this.prisma.planVersion.update({
      where: { id: planVersion.id },
      data: { status: 'applied' },
    });

    return { success: true, version };
  }

  // ===== 核心规划逻辑 =====

  /**
   * 分析每天的类型和空闲时间
   */
  private analyzeDays(trip: any): DayAnalysis[] {
    const days: DayAnalysis[] = [];
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    // 计算天数
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      let dayType: DayAnalysis['dayType'] = 'free';
      if (i === 0) dayType = 'departure';
      else if (i === dayCount - 1) dayType = 'return';

      // 检查是否有会议
      const dayMeetings = trip.meetings.filter((m: any) => {
        const mDate = new Date(m.meetingDate);
        return mDate.toDateString() === date.toDateString();
      });
      if (dayMeetings.length > 0) {
        dayType = 'meeting_day';
      }

      // 计算空闲时间
      const freeSlots = this.calculateFreeSlots(date, dayMeetings, dayType, trip);

      days.push({ date, dayType, freeSlots });
    }

    return days;
  }

  /**
   * 计算一天的空闲时间段
   */
  private calculateFreeSlots(
    date: Date,
    meetings: any[],
    dayType: string,
    trip: any,
  ): { start: Date; end: Date }[] {
    const slots: { start: Date; end: Date }[] = [];

    // 默认一天可用时间: 08:00 - 22:00
    let dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    let dayEnd = new Date(date);
    dayEnd.setHours(22, 0, 0, 0);

    // 出发日：考虑出发时间
    if (dayType === 'departure') {
      dayStart = new Date(trip.earliestDeparture);
    }

    // 返程日：考虑返程时间
    if (dayType === 'return') {
      dayEnd = new Date(trip.latestReturn);
      // 提前1小时到车站
      dayEnd = new Date(dayEnd.getTime() - 60 * 60 * 1000);
    }

    if (meetings.length === 0) {
      if (dayEnd > dayStart) {
        slots.push({ start: dayStart, end: dayEnd });
      }
      return slots;
    }

    // 有会议：排除会议时间
    const sortedMeetings = meetings.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

    let cursor = dayStart;
    for (const m of sortedMeetings) {
      const mStart = new Date(date);
      const [sh, sm] = m.startTime.split(':').map(Number);
      mStart.setHours(sh, sm, 0, 0);

      const mEnd = new Date(date);
      const [eh, em] = m.endTime.split(':').map(Number);
      mEnd.setHours(eh, em, 0, 0);

      // 会议前的空闲
      if (mStart > cursor) {
        const gapMinutes = (mStart.getTime() - cursor.getTime()) / (60 * 1000);
        if (gapMinutes >= 60) {
          slots.push({ start: cursor, end: mStart });
        }
      }
      cursor = mEnd;
    }

    // 会议后的空闲
    if (dayEnd > cursor) {
      const gapMinutes = (dayEnd.getTime() - cursor.getTime()) / (60 * 1000);
      if (gapMinutes >= 60) {
        slots.push({ start: cursor, end: dayEnd });
      }
    }

    return slots;
  }

  /**
   * 同步日程天到数据库
   */
  private async syncTripDays(tripId: string, analysis: DayAnalysis[]) {
    // 删除旧的天
    await this.prisma.tripDay.deleteMany({ where: { tripId } });

    // 创建新的天
    for (const day of analysis) {
      await this.prisma.tripDay.create({
        data: {
          tripId,
          localDate: day.date,
          dayType: day.dayType,
        },
      });
    }
  }

  /**
   * 生成交通推荐（Mock数据）
   */
  private async generateTransport(trip: any, analysis: DayAnalysis[]) {
    const items: any[] = [];

    // 去程
    const departureDay = analysis.find((d) => d.dayType === 'departure');
    if (departureDay) {
      const depDate = new Date(departureDay.date);
      if (trip.transportPreference === 'flight') {
        items.push({
          dayDate: departureDay.date,
          kind: 'transport',
          title: `${trip.originCity} → ${trip.destinationCity}`,
          subtitle: '航班 (Mock)',
          startAt: new Date(depDate.setHours(10, 0, 0, 0)),
          endAt: new Date(depDate.setHours(12, 30, 0, 0)),
          costMinor: 80000,
          icon: 'bi-airplane',
          locationText: `${trip.originCity}机场 → ${trip.destinationCity}机场`,
          transport: { mode: 'flight', durationSeconds: 9000, costMinor: 80000 },
        });
      } else {
        items.push({
          dayDate: departureDay.date,
          kind: 'transport',
          title: `${trip.originCity} → ${trip.destinationCity}`,
          subtitle: 'G7311',
          startAt: new Date(depDate.setHours(14, 30, 0, 0)),
          endAt: new Date(depDate.setHours(16, 15, 0, 0)),
          costMinor: 12000,
          icon: 'bi-train-front',
          locationText: `${trip.originCity}站 → ${trip.destinationCity}站`,
          transport: { mode: 'train', durationSeconds: 6300, costMinor: 12000 },
        });
      }
    }

    // 返程
    const returnDay = analysis.find((d) => d.dayType === 'return');
    if (returnDay) {
      const retDate = new Date(returnDay.date);
      if (trip.transportPreference === 'flight') {
        items.push({
          dayDate: returnDay.date,
          kind: 'transport',
          title: `${trip.destinationCity} → ${trip.originCity}`,
          subtitle: '航班 (Mock)',
          startAt: new Date(retDate.setHours(15, 0, 0, 0)),
          endAt: new Date(retDate.setHours(17, 30, 0, 0)),
          costMinor: 80000,
          icon: 'bi-airplane',
          locationText: `${trip.destinationCity}机场 → ${trip.originCity}机场`,
          transport: { mode: 'flight', durationSeconds: 9000, costMinor: 80000 },
        });
      } else {
        items.push({
          dayDate: returnDay.date,
          kind: 'transport',
          title: `${trip.destinationCity} → ${trip.originCity}`,
          subtitle: 'G7318',
          startAt: new Date(retDate.setHours(14, 0, 0, 0)),
          endAt: new Date(retDate.setHours(15, 45, 0, 0)),
          costMinor: 12000,
          icon: 'bi-train-front',
          locationText: `${trip.destinationCity}站 → ${trip.originCity}站`,
          transport: { mode: 'train', durationSeconds: 6300, costMinor: 12000 },
        });
      }
    }

    return items;
  }

  /**
   * 生成酒店推荐（Mock数据）
   */
  private async generateHotels(trip: any, analysis: DayAnalysis[]) {
    const items: any[] = [];

    // 查询目的地酒店
    const hotels = await this.prisma.place.findMany({
      where: { cityCode: this.getCityCode(trip.destinationCity), category: 'hotel' },
      take: 1,
    });

    const hotel = hotels[0] || {
      canonicalName: `${trip.destinationCity}商务酒店`,
      id: null,
    };

    const pricePerNight = Math.min(trip.hotelMaxPriceMinor, 35000); // 默认350

    // 除返程日外每天都住酒店
    for (let i = 0; i < analysis.length - 1; i++) {
      const day = analysis[i];
      const checkInDate = new Date(day.date);
      checkInDate.setHours(18, 0, 0, 0);

      items.push({
        dayDate: day.date,
        kind: 'hotel',
        title: `入住 ${hotel.canonicalName}`,
        subtitle: '住宿',
        startAt: checkInDate,
        costMinor: pricePerNight,
        icon: 'bi-building',
        placeId: hotel.id,
        locationText: trip.destinationCity,
      });
    }

    return items;
  }

  /**
   * 生成景点/餐饮推荐（Mock数据）
   */
  private async generateActivities(trip: any, analysis: DayAnalysis[], strategy: string) {
    const items: any[] = [];

    // 查询目的地景点
    const attractions = await this.prisma.place.findMany({
      where: {
        cityCode: this.getCityCode(trip.destinationCity),
        category: trip.attractionPreference === 'any' ? 'attraction' : 'attraction',
      },
      take: 6,
    });

    // 查询目的地餐厅
    const restaurants = await this.prisma.place.findMany({
      where: {
        cityCode: this.getCityCode(trip.destinationCity),
        category: 'restaurant',
      },
      take: 6,
    });

    let attractionIdx = 0;
    let restaurantIdx = 0;

    for (const day of analysis) {
      if (day.dayType === 'departure' || day.dayType === 'return') {
        // 出发日/返程日只安排一顿饭
        if (day.freeSlots.length > 0 && restaurants.length > 0) {
          const rest = restaurants[restaurantIdx % restaurants.length];
          restaurantIdx++;
          const slot = day.freeSlots[0];
          const mealStart = new Date(slot.start);

          items.push({
            dayDate: day.date,
            kind: 'meal',
            title: rest.canonicalName,
            subtitle: '餐饮',
            startAt: mealStart,
            endAt: new Date(mealStart.getTime() + 60 * 60 * 1000),
            costMinor: 6000,
            icon: 'bi-cup-hot',
            placeId: rest.id,
            locationText: rest.address,
          });
        }
        continue;
      }

      // 自由日/会议日：在空闲时间安排景点和餐饮
      for (const slot of day.freeSlots) {
        const slotHours = (slot.end.getTime() - slot.start.getTime()) / (60 * 60 * 1000);

        // 安排景点
        if (slotHours >= 2 && attractionIdx < attractions.length) {
          const attr = attractions[attractionIdx];
          attractionIdx++;
          const attrStart = new Date(slot.start);
          // 如果有会议，景点安排在会议后
          if (day.dayType === 'meeting_day') {
            attrStart.setHours(14, 0, 0, 0);
          }

          items.push({
            dayDate: day.date,
            kind: 'attraction',
            title: attr.canonicalName,
            subtitle: '景点',
            startAt: attrStart,
            endAt: new Date(attrStart.getTime() + 3 * 60 * 60 * 1000),
            costMinor: 0,
            icon: 'bi-tree',
            placeId: attr.id,
            locationText: attr.address,
          });
        }

        // 安排餐饮
        if (slotHours >= 1 && restaurantIdx < restaurants.length) {
          const rest = restaurants[restaurantIdx % restaurants.length];
          restaurantIdx++;
          const mealStart = new Date(slot.start);
          mealStart.setHours(12, 0, 0, 0);

          items.push({
            dayDate: day.date,
            kind: 'meal',
            title: rest.canonicalName,
            subtitle: '餐饮',
            startAt: mealStart,
            endAt: new Date(mealStart.getTime() + 60 * 60 * 1000),
            costMinor: 6000,
            icon: 'bi-cup-hot',
            placeId: rest.id,
            locationText: rest.address,
          });
        }
      }
    }

    return items;
  }

  /**
   * 写入行程活动项到数据库
   */
  private async writeItineraryItems(
    tripId: string,
    analysis: DayAnalysis[],
    items: any[],
  ) {
    // 按天分组
    const dayMap = new Map<string, string>(); // date -> dayId
    const days = await this.prisma.tripDay.findMany({ where: { tripId } });
    for (const day of days) {
      dayMap.set(day.localDate.toISOString().split('T')[0], day.id);
    }

    for (const item of items) {
      const dateKey = new Date(item.dayDate).toISOString().split('T')[0];
      const dayId = dayMap.get(dateKey);
      if (!dayId) continue;

      // 计算当天该位置
      const existingCount = await this.prisma.itineraryItem.count({
        where: { tripDayId: dayId },
      });

      await this.prisma.itineraryItem.create({
        data: {
          tripDayId: dayId,
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          position: existingCount,
          startAt: item.startAt,
          endAt: item.endAt,
          placeId: item.placeId,
          locationText: item.locationText,
          costMinor: item.costMinor || 0,
          icon: item.icon,
          sourceType: 'system',
        },
      });

      // 如果有交通信息，创建 TransportSegment
      if (item.transport) {
        const newItem = await this.prisma.itineraryItem.findFirst({
          where: { tripDayId: dayId, title: item.title },
          orderBy: { createdAt: 'desc' },
        });
        if (newItem) {
          await this.prisma.transportSegment.create({
            data: {
              itemId: newItem.id,
              mode: item.transport.mode,
              durationSeconds: item.transport.durationSeconds,
              costMinor: item.transport.costMinor,
            },
          });
        }
      }
    }
  }

  /**
   * 城市名 → 城市代码
   */
  private getCityCode(cityName: string): string {
    const map: Record<string, string> = {
      '上海': 'shanghai', '北京': 'beijing', '杭州': 'hangzhou',
      '南京': 'nanjing', '苏州': 'suzhou', '昆明': 'kunming',
      '成都': 'chengdu', '西安': 'xian', '广州': 'guangzhou',
      '深圳': 'shenzhen', '重庆': 'chongqing', '武汉': 'wuhan',
      '长沙': 'changsha', '厦门': 'xiamen', '青岛': 'qingdao',
    };
    return map[cityName] || cityName.toLowerCase();
  }
}
