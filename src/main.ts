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
    .addTag('攻略内容', '文本/链接导入与抽取')
    .addTag('地点', 'POI 搜索')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`\n🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`\n📋 Available API routes:`);
  console.log(`   POST   /api/v1/auth/register    - 注册`);
  console.log(`   POST   /api/v1/auth/login        - 登录`);
  console.log(`   POST   /api/v1/auth/guest         - 游客登录`);
  console.log(`   GET    /api/v1/auth/me             - 当前用户`);
  console.log(`   POST   /api/v1/trips               - 创建旅行`);
  console.log(`   GET    /api/v1/trips               - 行程列表`);
  console.log(`   GET    /api/v1/trips/:id           - 行程详情`);
  console.log(`   PATCH  /api/v1/trips/:id           - 更新行程`);
  console.log(`   DELETE /api/v1/trips/:id           - 删除行程`);
  console.log(`   GET    /api/v1/trips/:id/days      - 获取日程`);
  console.log(`   POST   /api/v1/trips/:id/items     - 新增活动项`);
  console.log(`   PATCH  /api/v1/trips/:id/items/:id - 修改活动项`);
  console.log(`   DELETE /api/v1/trips/:id/items/:id - 删除活动项`);
  console.log(`   POST   /api/v1/trips/:id/items/:id/move  - 移动活动`);
  console.log(`   POST   /api/v1/trips/:id/items/:id/lock  - 锁定`);
  console.log(`   POST   /api/v1/trips/:id/planning/plan   - 自动规划`);
  console.log(`   POST   /api/v1/trips/:id/quotes/search   - 搜索报价`);
  console.log(`   GET    /api/v1/trips/:id/quotes           - 获取报价`);
  console.log(`   POST   /api/v1/content/imports/text       - 导入文本攻略`);
  console.log(`   POST   /api/v1/content/imports/link       - 导入链接`);
  console.log(`   GET    /api/v1/places/search              - 搜索地点`);
  console.log(`   GET    /api/v1/places/cities              - 城市列表`);
  console.log();
}
bootstrap();
