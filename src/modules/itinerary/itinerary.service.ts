import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common';
import { CreateItemDto, UpdateItemDto, MoveItemDto, LockItemDto, ReorderItemsDto } from './dto/itinerary.dto';

@Injectable()
export class ItineraryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取所有天及活动项
   */
  async getDaysWithItems(userId: string, tripId: string) {
    // 确认用户有权访问
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    return this.prisma.tripDay.findMany({
      where: { tripId },
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
    });
  }

  /**
   * 新增活动项
   */
  async createItem(userId: string, tripId: string, dto: CreateItemDto) {
    await this.verifyTripOwnership(userId, tripId);

    // 确认天存在
    const day = await this.prisma.tripDay.findFirst({
      where: { id: dto.dayId, tripId },
    });
    if (!day) throw BusinessException.notFound('TripDay', dto.dayId);

    // 计算位置：如果没指定则放到最后
    let position = dto.position;
    if (position === undefined) {
      const lastItem = await this.prisma.itineraryItem.findFirst({
        where: { tripDayId: dto.dayId },
        orderBy: { position: 'desc' },
      });
      position = (lastItem?.position ?? -1) + 1;
    }

    const item = await this.prisma.itineraryItem.create({
      data: {
        tripDayId: dto.dayId,
        kind: dto.kind,
        title: dto.title,
        subtitle: dto.subtitle,
        position,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        placeId: dto.placeId,
        locationText: dto.locationText,
        costMinor: dto.costMinor ?? 0,
        isFixed: dto.isFixed ?? false,
        note: dto.note,
        icon: dto.icon,
      },
      include: { place: true },
    });

    // 更新 trip 版本
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    // 更新当日费用
    await this.updateDayCost(dto.dayId);

    return item;
  }

  /**
   * 修改活动项
   */
  async updateItem(userId: string, tripId: string, itemId: string, dto: UpdateItemDto) {
    await this.verifyTripOwnership(userId, tripId);

    const existing = await this.prisma.itineraryItem.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    });
    if (!existing) throw BusinessException.notFound('Item', itemId);

    // 锁定项不可修改
    if (existing.locked) {
      throw new BusinessException(
        ErrorCode.ITINERARY_TIME_CONFLICT,
        '该项目已锁定，无法修改',
        { itemId },
      );
    }

    // 乐观锁
    if (dto.version !== undefined && dto.version !== existing.version) {
      throw BusinessException.versionConflict(existing.version, dto.version);
    }

    const item = await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : existing.startAt,
        endAt: dto.endAt ? new Date(dto.endAt) : existing.endAt,
        version: { increment: 1 },
      },
      include: { place: true },
    });

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    await this.updateDayCost(existing.tripDayId);

    return item;
  }

  /**
   * 删除活动项
   */
  async deleteItem(userId: string, tripId: string, itemId: string) {
    await this.verifyTripOwnership(userId, tripId);

    const existing = await this.prisma.itineraryItem.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    });
    if (!existing) throw BusinessException.notFound('Item', itemId);

    if (existing.locked || existing.isFixed) {
      throw new BusinessException(
        ErrorCode.ITINERARY_TIME_CONFLICT,
        '固定/锁定项目不能删除',
        { itemId },
      );
    }

    await this.prisma.itineraryItem.delete({ where: { id: itemId } });

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    await this.updateDayCost(existing.tripDayId);

    return { success: true };
  }

  /**
   * 移动活动项（拖拽）
   */
  async moveItem(userId: string, tripId: string, itemId: string, dto: MoveItemDto) {
    const trip = await this.verifyTripOwnership(userId, tripId);

    // 乐观锁
    if (dto.baseVersion !== trip.version) {
      throw BusinessException.versionConflict(trip.version, dto.baseVersion);
    }

    const existing = await this.prisma.itineraryItem.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    });
    if (!existing) throw BusinessException.notFound('Item', itemId);

    if (existing.locked || existing.isFixed) {
      throw new BusinessException(
        ErrorCode.ITINERARY_TIME_CONFLICT,
        '固定/锁定项目不能移动',
        { itemId },
      );
    }

    // 确认目标天存在
    const targetDay = await this.prisma.tripDay.findFirst({
      where: { id: dto.toDayId, tripId },
    });
    if (!targetDay) throw BusinessException.notFound('TripDay', dto.toDayId);

    // 计算新位置
    let newPosition = dto.position ?? 0;
    if (dto.beforeItemId) {
      const beforeItem = await this.prisma.itineraryItem.findUnique({
        where: { id: dto.beforeItemId },
      });
      if (beforeItem) {
        newPosition = beforeItem.position;
      }
    } else if (newPosition === 0 && !dto.position) {
      // 放到最后
      const lastItem = await this.prisma.itineraryItem.findFirst({
        where: { tripDayId: dto.toDayId },
        orderBy: { position: 'desc' },
      });
      newPosition = (lastItem?.position ?? -1) + 1;
    }

    // 更新
    await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        tripDayId: dto.toDayId,
        position: newPosition,
        version: { increment: 1 },
      },
    });

    // 更新 trip 版本
    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    return { success: true, version: updatedTrip.version };
  }

  /**
   * 锁定/解锁
   */
  async lockItem(userId: string, tripId: string, itemId: string, dto: LockItemDto) {
    await this.verifyTripOwnership(userId, tripId);

    const existing = await this.prisma.itineraryItem.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    });
    if (!existing) throw BusinessException.notFound('Item', itemId);

    const item = await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: { locked: dto.locked, version: { increment: 1 } },
    });

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    return item;
  }

  /**
   * 批量排序
   */
  async reorderItems(userId: string, tripId: string, dto: ReorderItemsDto) {
    const trip = await this.verifyTripOwnership(userId, tripId);

    if (dto.baseVersion !== trip.version) {
      throw BusinessException.versionConflict(trip.version, dto.baseVersion);
    }

    // 批量更新位置
    const updates = dto.items.map((item) =>
      this.prisma.itineraryItem.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    );
    await this.prisma.$transaction(updates);

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: { version: { increment: 1 } },
    });

    return { success: true, version: updatedTrip.version };
  }

  // ---- Helpers ----

  private async verifyTripOwnership(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);
    return trip;
  }

  private async updateDayCost(dayId: string) {
    const items = await this.prisma.itineraryItem.findMany({
      where: { tripDayId: dayId },
      select: { costMinor: true },
    });
    const totalCostMinor = items.reduce((sum, i) => sum + i.costMinor, 0);
    await this.prisma.tripDay.update({
      where: { id: dayId },
      data: { totalCostMinor },
    });
  }
}
