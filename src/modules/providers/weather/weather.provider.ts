import { Injectable, Logger } from '@nestjs/common';
import { AmapProvider } from '../amap/amap.provider';
import { providerConfig } from '../provider.config';

export interface WeatherSnapshot {
  provider: string;
  city: string;
  weather: string;
  temperature: string;
  humidity?: string;
  wind?: string;
  reportTime?: string;
  forecast?: Array<{
    date: string;
    dayWeather: string;
    nightWeather: string;
    dayTemp: string;
    nightTemp: string;
  }>;
  observedAt: string;
}

@Injectable()
export class WeatherProvider {
  private readonly logger = new Logger(WeatherProvider.name);

  constructor(private readonly amap: AmapProvider) {}

  isEnabled(): boolean {
    return providerConfig.weather.enabled;
  }

  async getWeather(city: string): Promise<WeatherSnapshot | null> {
    if (!this.isEnabled()) return null;

    const provider = providerConfig.weather.provider;
    if (provider === 'amap' || !providerConfig.weather.qweatherKey) {
      return this.fromAmap(city);
    }
    // qweather stub — fall back to amap if not configured
    return this.fromAmap(city);
  }

  private async fromAmap(city: string): Promise<WeatherSnapshot | null> {
    if (!this.amap.isEnabled()) {
      this.logger.warn('Weather via amap unavailable');
      return null;
    }
    try {
      const live = await this.amap.weatherLive(city);
      const casts = await this.amap.weatherForecast(city);
      if (!live) return null;
      return {
        provider: 'amap',
        city: live.city,
        weather: live.weather,
        temperature: live.temperature,
        humidity: live.humidity,
        wind: live.winddirection
          ? `${live.winddirection}风 ${live.windpower || ''}级`
          : undefined,
        reportTime: live.reporttime,
        forecast: (casts || []).map((c: any) => ({
          date: c.date,
          dayWeather: c.dayweather,
          nightWeather: c.nightweather,
          dayTemp: c.daytemp,
          nightTemp: c.nighttemp,
        })),
        observedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      this.logger.warn(`weather failed: ${e.message}`);
      return null;
    }
  }
}
