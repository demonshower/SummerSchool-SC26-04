import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
// Load backend/.env (works for both ts-node and compiled dist/)
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter, TransformInterceptor } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS - 前后端分离必须
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局响应转换
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('Trip Planner API')
    .setDescription('出差行程规划助手 - 后端 API V1')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('认证', '用户注册/登录/JWT')
    .addTag('旅行', '行程 CRUD')
    .addTag('行程编辑', '活动项增删改/排序/锁定')
    .addTag('自动规划', '规则引擎规划')
    .addTag('报价比价', 'Mock 报价搜索/刷新')
    .addTag('攻略内容', '文本/链接导入与抽取（LLM）')
    .addTag('地点', 'POI 搜索（本地+高德）')
    .addTag('外部服务', '高德/天气/大模型健康检查与调试')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`\n🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`🔌 Providers health: http://localhost:${port}/api/v1/providers/health`);
  console.log();
}
bootstrap();
