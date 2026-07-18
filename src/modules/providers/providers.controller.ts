import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmProvider } from './llm/llm.provider';
import { AmapProvider } from './amap/amap.provider';
import { WeatherProvider } from './weather/weather.provider';
import { BochaProvider } from './search/bocha.provider';
import { providerConfig } from './provider.config';

@ApiTags('外部服务')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly llm: LlmProvider,
    private readonly amap: AmapProvider,
    private readonly weather: WeatherProvider,
    private readonly bocha: BochaProvider,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '外部服务配置状态（不含密钥）' })
  health() {
    return {
      llm: {
        enabled: this.llm.isEnabled(),
        provider: process.env.LLM_PROVIDER || 'ecnu',
        baseUrl: providerConfig.llm.baseUrl,
        model: providerConfig.llm.model,
      },
      amap: {
        enabled: this.amap.isEnabled(),
        provider: 'amap',
      },
      weather: {
        enabled: this.weather.isEnabled(),
        provider: providerConfig.weather.provider,
      },
      bocha: {
        enabled: this.bocha.isEnabled(),
        provider: 'bocha',
        baseUrl: providerConfig.bocha.baseUrl,
      },
    };
  }

  @Get('weather')
  @ApiOperation({ summary: '查询城市天气' })
  async getWeather(@Query('city') city: string) {
    if (!city) return { error: 'city is required' };
    return this.weather.getWeather(city);
  }

  @Get('geocode')
  @ApiOperation({ summary: '地址地理编码' })
  async geocode(@Query('address') address: string, @Query('city') city?: string) {
    if (!address) return { error: 'address is required' };
    try {
      return { result: await this.amap.geocode(address, city) };
    } catch (e: any) {
      return { error: e.message, result: null };
    }
  }

  @Get('poi')
  @ApiOperation({ summary: '高德 POI 搜索' })
  async searchPoi(
    @Query('q') q: string,
    @Query('city') city?: string,
    @Query('types') types?: string,
  ) {
    if (!q) return { error: 'q is required' };
    try {
      return { pois: await this.amap.searchPoi(q, city, types) };
    } catch (e: any) {
      return { error: e.message, pois: [] };
    }
  }

  @Get('route')
  @ApiOperation({ summary: '两点路径规划 origin/destination 为 lng,lat' })
  async route(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('city') city?: string,
    @Query('mode') mode?: string,
  ) {
    if (!origin || !destination) return { error: 'origin and destination required' };
    try {
      if (mode === 'driving') return await this.amap.drivingRoute(origin, destination);
      if (mode === 'walking') return await this.amap.walkingRoute(origin, destination);
      if (mode === 'transit' && city) return await this.amap.transitRoute(origin, destination, city);
      return await this.amap.smartRoute(origin, destination, city);
    } catch (e: any) {
      return { error: e.message, mode: 'unknown', distanceMeters: 0, durationSeconds: 0 };
    }
  }

  @Post('search/web')
  @ApiOperation({ summary: '博查网页搜索（调试，无需登录）' })
  async searchWeb(
    @Body('query') query: string,
    @Body('count') count?: number,
    @Body('freshness') freshness?: string,
    @Body('site') site?: string,
  ) {
    if (!query?.trim()) return { error: 'query is required' };
    if (!this.bocha.isEnabled()) return { error: 'Bocha not configured' };
    try {
      return await this.bocha.webSearch(query, { count, freshness, site, summary: true });
    } catch (e: any) {
      return { error: e.message };
    }
  }

  @Post('ai/parse-request')
  @ApiOperation({ summary: '自然语言行程需求解析' })
  async parseRequest(@Body('text') text: string) {
    if (!text?.trim()) return { error: 'text is required' };
    if (!this.llm.isEnabled()) return { error: 'LLM not configured', fallback: true };
    const parsed = await this.llm.parseTripRequest(text);
    return { parsed, provider: 'ecnu' };
  }

  @Post('ai/extract-places')
  @ApiOperation({ summary: 'LLM 攻略地点抽取（调试）' })
  async extractPlaces(@Body('text') text: string, @Body('city') city?: string) {
    if (!text?.trim()) return { error: 'text is required' };
    if (!this.llm.isEnabled()) return { error: 'LLM not configured' };
    const places = await this.llm.extractPlacesFromGuide(text, city);
    return { places, count: places.length };
  }

  @Post('ai/chat')
  @ApiOperation({ summary: 'LLM 原始对话调试' })
  async chat(@Body('prompt') prompt: string) {
    if (!prompt?.trim()) return { error: 'prompt is required' };
    if (!this.llm.isEnabled()) return { error: 'LLM not configured' };
    const content = await this.llm.chat([{ role: 'user', content: prompt }]);
    return { content };
  }
}
