import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { SearchPlacesDto } from './dto/place.dto';
import { AmapProvider } from '../providers/amap/amap.provider';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amap: AmapProvider,
  ) {}

  /**
   * 搜索地点：本地库 + 高德 POI（实时）
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
      where.AND = [
        {
          OR: [
            { canonicalName: { contains: dto.q } },
            { address: { contains: dto.q } },
          ],
        },
      ];
    }

    if (dto.category) {
      where.category = dto.category;
    }

    const localPlaces = await this.prisma.place.findMany({
      where,
      take: dto.limit || 20,
      orderBy: { canonicalName: 'asc' },
    });

    // 补充高德实时结果
    let amapPlaces: any[] = [];
    if (this.amap.isEnabled() && dto.q) {
      try {
        const types = this.categoryToAmapTypes(dto.category);
        const pois = await this.amap.searchPoi(dto.q, dto.city, types, dto.limit || 10);
        amapPlaces = pois.map((p) => {
          const loc = this.amap.parseLocation(p.location);
          return {
            id: `amap_${p.id}`,
            canonicalName: p.name,
            category: this.mapAmapTypeToCategory(p.type),
            cityCode: (dto.city || p.cityname || '').toLowerCase(),
            cityName: p.cityname || dto.city || '',
            address: p.address || p.adname || '',
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            timezone: 'Asia/Shanghai',
            attributes: {
              amapId: p.id,
              type: p.type,
              source: 'amap',
              live: true,
            },
            source: 'amap',
          };
        });
      } catch (e: any) {
        this.logger.warn(`Amap place search failed: ${e.message}`);
      }
    }

    return {
      local: localPlaces,
      live: amapPlaces,
      total: localPlaces.length + amapPlaces.length,
    };
  }

  async findById(placeId: string) {
    // amap_ 前缀：实时 POI 不落库详情，返回占位
    if (placeId.startsWith('amap_')) {
      return {
        id: placeId,
        canonicalName: placeId,
        category: 'attraction',
        attributes: { source: 'amap', note: 'Live POI, fetch via search' },
      };
    }

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

  async getCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  private categoryToAmapTypes(category?: string): string | undefined {
    if (!category) return undefined;
    const map: Record<string, string> = {
      attraction: '110000',
      restaurant: '050000',
      hotel: '100000',
      station: '150000',
      shopping: '060000',
    };
    return map[category];
  }

  private mapAmapTypeToCategory(type: string): string {
    if (!type) return 'attraction';
    if (type.includes('餐') || type.includes('美食')) return 'restaurant';
    if (type.includes('酒店') || type.includes('宾馆') || type.includes('住宿')) return 'hotel';
    if (type.includes('车站') || type.includes('机场') || type.includes('地铁')) return 'station';
    if (type.includes('购物') || type.includes('商场')) return 'shopping';
    return 'attraction';
  }
}
