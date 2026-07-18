import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common';
import { CreateTripDto, UpdateTripDto, TripQueryDto } from './dto/trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建旅行
   */
  async create(userId: string, dto: CreateTripDto) {
    // 校验日期
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate > endDate) {
      throw new BusinessException(
        ErrorCode.INVALID_TRIP_WINDOW,
        '出发日期不能晚于返回日期',
      );
    }

    // 清洗会议：过滤不完整条目，避免校验/写入失败
    const meetings = (dto.meetings || [])
      .filter(
        (m): m is Required<
          Pick<
            NonNullable<(typeof dto.meetings)>[number],
            'meetingDate' | 'startTime' | 'endTime' | 'location'
          >
        > &
          NonNullable<(typeof dto.meetings)>[number] =>
          !!m &&
          !!m.meetingDate &&
          !!String(m.startTime || '').trim() &&
          !!String(m.endTime || '').trim() &&
          !!String(m.location || '').trim(),
      )
      .map((m) => ({
        title: (m.title && String(m.title).trim()) || '会议',
        meetingDate: new Date(m.meetingDate as string),
        startTime: String(m.startTime).trim().slice(0, 5),
        endTime: String(m.endTime).trim().slice(0, 5),
        location: String(m.location).trim(),
        address: m.address,
        lat: m.lat,
        lng: m.lng,
      }));

    const trip = await this.prisma.trip.create({
      data: {
        ownerId: userId,
        title: dto.title || `${dto.originCity} → ${dto.destinationCity}`,
        originCity: dto.originCity,
        destinationCity: dto.destinationCity,
        startDate,
        endDate,
        earliestDeparture: new Date(dto.earliestDeparture),
        latestReturn: new Date(dto.latestReturn),
        budgetMinor: dto.budgetMinor,
        transportPreference: dto.transportPreference || 'any',
        hotelMaxPriceMinor: dto.hotelMaxPriceMinor,
        wantsSightseeing: dto.wantsSightseeing ?? true,
        attractionPreference: dto.attractionPreference || 'any',
        pace: dto.pace || 'balanced',
        status: 'draft',
        meetings: meetings.length
          ? {
              create: meetings,
            }
          : undefined,
      },
      include: {
        meetings: true,
        days: { orderBy: { localDate: 'asc' } },
      },
    });

    return trip;
  }

  /**
   * 获取行程列表
   */
  async findAll(userId: string, query: TripQueryDto) {
    const where: any = { ownerId: userId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        include: {
          meetings: { select: { id: true, title: true, meetingDate: true } },
          _count: { select: { days: true } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  /**
   * 获取行程详情
   */
  async findOne(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
      include: {
        meetings: { orderBy: { meetingDate: 'asc' } },
        days: {
          orderBy: { localDate: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' },
              include: {
                place: true,
                transportSegment: true,
              },
            },
          },
        },
        quoteSearches: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { quotes: { take: 10 } },
        },
        planVersions: {
          orderBy: { version: 'desc' },
          take: 3,
        },
      },
    });

    if (!trip) {
      throw BusinessException.notFound('Trip', tripId);
    }

    // 计算费用汇总
    const costSummary = this.calculateCostSummary(trip);

    return { ...trip, costSummary };
  }

  /**
   * 更新旅行
   */
  async update(userId: string, tripId: string, dto: UpdateTripDto) {
    // 先查询当前版本
    const existing = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!existing) {
      throw BusinessException.notFound('Trip', tripId);
    }

    // 乐观锁检查
    if (dto.version !== undefined && dto.version !== existing.version) {
      throw BusinessException.versionConflict(existing.version, dto.version);
    }

    const trip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...dto,
        version: { increment: 1 },
      },
      include: {
        meetings: true,
        days: { orderBy: { localDate: 'asc' } },
      },
    });

    return trip;
  }

  /**
   * 删除行程
   */
  async remove(userId: string, tripId: string) {
    const existing = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!existing) {
      throw BusinessException.notFound('Trip', tripId);
    }

    await this.prisma.trip.delete({ where: { id: tripId } });
    return { success: true };
  }

  /**
   * 计算费用汇总
   */
  private calculateCostSummary(trip: any) {
    let transportMinor = 0;
    let hotelMinor = 0;
    let mealMinor = 0;
    let commuteMinor = 0;
    let attractionMinor = 0;

    for (const day of trip.days) {
      for (const item of day.items) {
        switch (item.kind) {
          case 'transport':
            transportMinor += item.costMinor;
            break;
          case 'hotel':
            hotelMinor += item.costMinor;
            break;
          case 'meal':
            mealMinor += item.costMinor;
            break;
          case 'commute':
            commuteMinor += item.costMinor;
            break;
          case 'attraction':
            attractionMinor += item.costMinor;
            break;
        }
      }
    }

    const totalMinor = transportMinor + hotelMinor + mealMinor + commuteMinor + attractionMinor;
    const budgetMinor = trip.budgetMinor;

    let status: string;
    if (totalMinor <= budgetMinor * 0.9) {
      status = 'within_budget';
    } else if (totalMinor <= budgetMinor) {
      status = 'close_to_budget';
    } else if (totalMinor <= budgetMinor * 1.1) {
      status = 'slightly_over';
    } else {
      status = 'over_budget';
    }

    return {
      transportMinor,
      hotelMinor,
      mealMinor,
      commuteMinor,
      attractionMinor,
      totalMinor,
      budgetMinor,
      remainingMinor: budgetMinor - totalMinor,
      status,
    };
  }
}
