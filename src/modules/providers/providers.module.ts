import { Global, Module } from '@nestjs/common';
import { LlmProvider } from './llm/llm.provider';
import { AmapProvider } from './amap/amap.provider';
import { WeatherProvider } from './weather/weather.provider';
import { BochaProvider } from './search/bocha.provider';
import { ProvidersController } from './providers.controller';

@Global()
@Module({
  controllers: [ProvidersController],
  providers: [LlmProvider, AmapProvider, WeatherProvider, BochaProvider],
  exports: [LlmProvider, AmapProvider, WeatherProvider, BochaProvider],
})
export class ProvidersModule {}
