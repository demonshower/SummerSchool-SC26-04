import { Injectable, Logger } from '@nestjs/common';
import { providerConfig } from '../provider.config';

export interface AmapPoi {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string; // "lng,lat"
  pname?: string;
  cityname?: string;
  adname?: string;
  tel?: string;
}

export interface AmapRouteResult {
  mode: string;
  distanceMeters: number;
  durationSeconds: number;
  costMinor?: number;
  stepsSummary?: string;
  raw?: any;
}

export interface AmapWeatherLive {
  city: string;
  weather: string;
  temperature: string;
  winddirection?: string;
  windpower?: string;
  humidity?: string;
  reporttime?: string;
}

export interface AmapGeoResult {
  formattedAddress: string;
  province?: string;
  city?: string;
  district?: string;
  location: string;
  level?: string;
}

@Injectable()
export class AmapProvider {
  private readonly logger = new Logger(AmapProvider.name);

  isEnabled(): boolean {
    return providerConfig.amap.enabled && !!providerConfig.amap.webServiceKey;
  }

  private async get(path: string, params: Record<string, string>): Promise<any> {
    if (!this.isEnabled()) {
      throw new Error('Amap provider is not configured');
    }
    const url = new URL(`${providerConfig.amap.baseUrl}${path}`);
    url.searchParams.set('key', providerConfig.amap.webServiceKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Amap HTTP ${res.status}`);
    }
    const data = await res.json();
    if (String(data.status) !== '1') {
      const info = data.info || 'unknown';
      const code = data.infocode || '';
      this.logger.warn(`Amap API error path=${path} info=${info} infocode=${code}`);
      // 10009 USERKEY_PLAT_NOMATCH: Key 类型不是 Web 服务 Key
      if (String(code) === '10009' || info === 'USERKEY_PLAT_NOMATCH') {
        throw new Error(
          'Amap USERKEY_PLAT_NOMATCH: 当前 Key 不是「Web服务」类型。请在高德控制台创建应用时选择「Web服务」，并把新 Key 写入 AMAP_WEB_SERVICE_KEY',
        );
      }
      throw new Error(`Amap error: ${info}`);
    }
    return data;
  }

  /** 地理编码：地址 → 坐标 */
  async geocode(address: string, city?: string): Promise<AmapGeoResult | null> {
    const data = await this.get('/v3/geocode/geo', {
      address,
      city: city || '',
    });
    const g = data.geocodes?.[0];
    if (!g) return null;
    return {
      formattedAddress: g.formatted_address,
      province: g.province,
      city: typeof g.city === 'string' ? g.city : g.city?.[0],
      district: g.district,
      location: g.location,
      level: g.level,
    };
  }

  /** 逆地理：坐标 → 地址 */
  async regeocode(lng: number, lat: number): Promise<string | null> {
    const data = await this.get('/v3/geocode/regeo', {
      location: `${lng},${lat}`,
    });
    return data.regeocode?.formatted_address || null;
  }

  /** POI 关键词搜索 */
  async searchPoi(keywords: string, city?: string, types?: string, offset = 20): Promise<AmapPoi[]> {
    const data = await this.get('/v3/place/text', {
      keywords,
      city: city || '',
      types: types || '',
      offset: String(offset),
      page: '1',
      extensions: 'base',
    });
    return (data.pois || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      typecode: p.typecode,
      address: p.address || '',
      location: p.location,
      pname: p.pname,
      cityname: p.cityname,
      adname: p.adname,
      tel: p.tel,
    }));
  }

  /** 驾车路径规划 */
  async drivingRoute(origin: string, destination: string): Promise<AmapRouteResult> {
    // origin/destination: "lng,lat"
    const data = await this.get('/v3/direction/driving', {
      origin,
      destination,
      extensions: 'base',
      strategy: '0',
    });
    const path = data.route?.paths?.[0];
    if (!path) {
      return { mode: 'driving', distanceMeters: 0, durationSeconds: 0 };
    }
    return {
      mode: 'driving',
      distanceMeters: Number(path.distance) || 0,
      durationSeconds: Number(path.duration) || 0,
      // 高德 taxi_cost 单位为元
      costMinor: path.tolls ? Math.round(Number(path.tolls) * 100) : undefined,
      stepsSummary: (path.steps || [])
        .slice(0, 3)
        .map((s: any) => s.instruction)
        .filter(Boolean)
        .join('；'),
    };
  }

  /** 步行路径 */
  async walkingRoute(origin: string, destination: string): Promise<AmapRouteResult> {
    const data = await this.get('/v3/direction/walking', {
      origin,
      destination,
    });
    const path = data.route?.paths?.[0];
    if (!path) {
      return { mode: 'walking', distanceMeters: 0, durationSeconds: 0 };
    }
    return {
      mode: 'walking',
      distanceMeters: Number(path.distance) || 0,
      durationSeconds: Number(path.duration) || 0,
    };
  }

  /** 公交路径（需要城市名） */
  async transitRoute(
    origin: string,
    destination: string,
    city: string,
  ): Promise<AmapRouteResult> {
    const data = await this.get('/v3/direction/transit/integrated', {
      origin,
      destination,
      city,
      strategy: '0',
    });
    const trans = data.route?.transits?.[0];
    if (!trans) {
      // fallback walking if no transit
      return this.walkingRoute(origin, destination);
    }
    return {
      mode: 'transit',
      distanceMeters: Number(trans.distance) || 0,
      durationSeconds: Number(trans.duration) || 0,
      costMinor: trans.cost ? Math.round(Number(trans.cost) * 100) : undefined,
      stepsSummary: `公交约 ${Math.round(Number(trans.duration) / 60)} 分钟`,
    };
  }

  /**
   * 智能选模式：短距步行，否则尝试公交，再驾车
   */
  async smartRoute(
    origin: string,
    destination: string,
    city?: string,
  ): Promise<AmapRouteResult> {
    try {
      const walk = await this.walkingRoute(origin, destination);
      if (walk.distanceMeters > 0 && walk.distanceMeters <= 1200) {
        return walk;
      }
      if (city) {
        try {
          return await this.transitRoute(origin, destination, city);
        } catch {
          /* fallthrough */
        }
      }
      return await this.drivingRoute(origin, destination);
    } catch (e: any) {
      this.logger.warn(`smartRoute failed: ${e.message}`);
      return { mode: 'unknown', distanceMeters: 0, durationSeconds: 0 };
    }
  }

  /** 实时天气 */
  async weatherLive(city: string): Promise<AmapWeatherLive | null> {
    const data = await this.get('/v3/weather/weatherInfo', {
      city,
      extensions: 'base',
    });
    const live = data.lives?.[0];
    if (!live) return null;
    return {
      city: live.city,
      weather: live.weather,
      temperature: live.temperature,
      winddirection: live.winddirection,
      windpower: live.windpower,
      humidity: live.humidity,
      reporttime: live.reporttime,
    };
  }

  /** 预报天气 */
  async weatherForecast(city: string): Promise<any[]> {
    const data = await this.get('/v3/weather/weatherInfo', {
      city,
      extensions: 'all',
    });
    return data.forecasts?.[0]?.casts || [];
  }

  parseLocation(location: string): { lng: number; lat: number } | null {
    if (!location || !location.includes(',')) return null;
    const [lng, lat] = location.split(',').map(Number);
    if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
    return { lng, lat };
  }
}
