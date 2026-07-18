import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { SearchPlacesDto } from './dto/place.dto';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 搜索地点
   */
  async search(dto: SearchPlacesDto) {
    const where: any = {};

    if (dto.city) {
      where.OR = [
        { cityName: { contains: dto.city } },
        { cityCode: { contains: dto.city.toLowerCase() } },
      ];
    }

    if (dto.q) {
      where.OR = [
        ...(where.OR || []),
        { canonicalName: { contains: dto.q } },
        { address: { contains: dto.q } },
      ];
    }

    if (dto.category) {
      where.category = dto.category;
    }

    const places = await this.prisma.place.findMany({
      where,
      take: dto.limit || 20,
      orderBy: { canonicalName: 'asc' },
    });

    return places;
  }

  /**
   * 地点详情
   */
  async findById(placeId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      include: {
        mentions: {
          take: 5,
          include: { contentSource: true },
        },
      },
    });
    if (!place) throw BusinessException.notFound('Place', placeId);
    return place;
  }

  /**
   * 获取城市列表
   */
  async getCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
