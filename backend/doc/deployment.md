# 出差行程规划助手 — V1 后端部署指南

> 从零开始，在全新环境中完成数据库、缓存、后端服务的初始化与启动。

---

## 目录

1. [环境要求](#1-环境要求)
2. [项目目录结构](#2-项目目录结构)
3. [方式一：Docker 一键启动（推荐）](#3-方式一docker-一键启动推荐)
4. [方式二：本地开发模式](#4-方式二本地开发模式)
5. [数据库初始化](#5-数据库初始化)
6. [环境变量说明](#6-环境变量说明)
7. [服务验证](#7-服务验证)
8. [常用运维命令](#8-常用运维命令)
9. [生产环境部署](#9-生产环境部署)
10. [常见问题](#10-常见问题)

---

## 1. 环境要求

### 开发模式（本地运行）

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | v22+ | 推荐使用 LTS 版本 |
| npm | v10+ | 随 Node.js 安装 |
| Docker | v24+ | 用于运行 PostgreSQL 和 Redis |
| Docker Compose | v2.20+ | Docker Desktop 已内置 |

### Docker 模式（全部容器化）

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Docker | v24+ | 唯一必需的依赖 |
| Docker Compose | v2.20+ | Docker Desktop 已内置 |

### 验证安装

```bash
# 检查 Node.js
node --version     # 期望: v22.x.x

# 检查 npm
npm --version      # 期望: 10.x.x

# 检查 Docker
docker --version   # 期望: Docker version 24.x.x+

# 检查 Docker Compose
docker compose version  # 期望: Docker Compose version v2.x.x
```

---

## 2. 项目目录结构

```
backend/
├── src/                          # 源代码
│   ├── main.ts                   # 启动入口
│   ├── app.module.ts             # 根模块
│   ├── prisma/                   # 数据库连接
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── common/                   # 公共工具
│   │   ├── constants/error-codes.ts
│   │   ├── exceptions/business.exception.ts
│   │   ├── filters/all-exceptions.filter.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   └── decorators/current-user.decorator.ts
│   └── modules/                  # 业务模块
│       ├── auth/                 # 认证
│       ├── users/                # 用户
│       ├── trips/                # 旅行
│       ├── itinerary/            # 行程
│       ├── planning/             # 规划引擎
│       ├── quotes/               # 报价
│       ├── content/              # 攻略
│       └── places/               # 地点
│
├── prisma/                       # 数据库
│   ├── schema.prisma             # 数据模型定义 (14 张表)
│   ├── seed.sql                  # 种子数据 (15城市 + 40地点)
│   ├── seed.ts                   # TypeScript 版种子脚本
│   └── migrations/               # 迁移文件
│       └── 20260718_init_v1/
│           └── migration.sql
│
├── doc/                          # 文档
│   ├── api-v1.md                 # 接口文档
│   └── deployment.md             # 本文件
│
├── docker-compose.yml            # Docker 编排
├── Dockerfile                    # 容器构建
├── .dockerignore                 # Docker 忽略文件
├── .gitignore                    # Git 忽略文件
├── .env                          # 环境变量 (本地开发用, 不入库)
├── .env.example                  # 环境变量模板
├── package.json                  # 依赖和脚本
├── tsconfig.json                 # TypeScript 配置
├── tsconfig.build.json
└── nest-cli.json                 # NestJS CLI 配置
```

---

## 3. 方式一：Docker 一键启动（推荐）

> 适用于：快速体验、演示、CI/CD、服务器部署

### 3.1 前置条件

确保 Docker Desktop 已安装并运行。

### 3.2 启动全部服务

```bash
# 进入后端目录
cd backend

# 一键构建并启动 (PostgreSQL + Redis + API)
docker compose up --build -d
```

首次构建约需 3-5 分钟（下载 Node.js 镜像 + 安装依赖 + 编译）。

### 3.3 等待服务就绪

```bash
# 查看服务状态
docker compose ps

# 期望输出:
# NAME                STATUS
# trip_planner_db     Up (healthy)
# trip_planner_redis  Up
# trip_planner_api    Up
```

### 3.4 初始化数据库表结构

首次启动后，数据库是空的，需要导入表结构和种子数据：

```bash
# 生成 SQL 并导入表结构
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  | docker exec -i trip_planner_db psql -U tripplanner -d trip_planner

# 导入种子数据
docker cp prisma/seed.sql trip_planner_db:/tmp/seed.sql
docker exec trip_planner_db psql -U tripplanner -d trip_planner -f /tmp/seed.sql
```

> **注意：** 如果本机没有 Node.js，可以用 Docker 内执行：
> ```bash
> docker exec trip_planner_api npx prisma migrate diff \
>   --from-empty --to-schema-datamodel prisma/schema.prisma --script \
>   | docker exec -i trip_planner_db psql -U tripplanner -d trip_planner
> ```

### 3.5 验证

```bash
# 测试 API
curl http://localhost:8080/api/v1/places/cities

# 应返回 15 个城市的 JSON 数据
```

### 3.6 停止服务

```bash
# 停止（保留数据）
docker compose down

# 停止并删除数据（完全重置）
docker compose down -v
```

---

## 4. 方式二：本地开发模式

> 适用于：日常开发、调试、热重载

### 4.1 启动数据库和缓存

```bash
cd backend

# 只启动 PostgreSQL 和 Redis（不启动 API）
docker compose up -d postgres redis
```

等待 PostgreSQL 就绪：

```bash
# 等待数据库就绪 (最多 30 秒)
for i in $(seq 1 30); do
  docker exec trip_planner_db pg_isready -U tripplanner && break
  sleep 1
done
```

### 4.2 修复 PostgreSQL 认证

Docker Desktop 在 Windows/Mac 上的端口转发可能导致认证问题。执行以下命令确保连接正常：

```bash
# 将 pg_hba.conf 设为 trust 模式（开发环境）
docker exec -u postgres trip_planner_db bash -c "
sed -i 's/scram-sha-256/trust/g' /var/lib/postgresql/data/pg_hba.conf
pg_ctl reload -D /var/lib/postgresql/data
"
```

> **说明：** 生产环境中不应使用 trust 模式，请参见 [生产环境部署](#9-生产环境部署)。

### 4.3 安装依赖

```bash
cd backend

# 使用国内镜像安装（推荐）
npm install --registry=https://registry.npmmirror.com

# 或使用默认源
npm install
```

### 4.4 配置环境变量

```bash
# 从模板创建 .env 文件
cp .env.example .env

# 编辑 .env（通常默认配置即可直接用于开发）
```

默认 `.env` 内容：

```env
DATABASE_URL="postgresql://tripplanner:tripplanner_dev@localhost:5432/trip_planner?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=8080
CORS_ORIGIN=http://localhost:3000
```

### 4.5 初始化数据库

```bash
# 生成 Prisma Client（类型定义）
npx prisma generate

# 方法一：使用迁移文件初始化
npx prisma migrate deploy

# 方法二：直接导入 SQL（推荐，更简单）
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  | docker exec -i trip_planner_db psql -U tripplanner -d trip_planner
```

### 4.6 导入种子数据

```bash
docker cp prisma/seed.sql trip_planner_db:/tmp/seed.sql
docker exec trip_planner_db psql -U tripplanner -d trip_planner -f /tmp/seed.sql
```

验证数据：

```bash
docker exec trip_planner_db psql -U tripplanner -d trip_planner \
  -c "SELECT 'cities' as tbl, count(*) FROM cities UNION ALL SELECT 'places', count(*) FROM places;"
```

期望输出：
```
 tbl    | count
--------+-------
 cities |    15
 places |    40
```

### 4.7 启动开发服务器

```bash
# 编译并启动（带热重载）
npm run start:dev

# 或仅编译后启动
npm run build
npm run start:prod
```

启动成功后输出：

```
🚀 API Server running on http://localhost:8080
📚 Swagger docs: http://localhost:8080/api/docs
```

---

## 5. 数据库初始化

### 5.1 表结构（14 张表）

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| `users` | 用户 | id, username, email, passwordHash, isGuest |
| `trips` | 旅行 | ownerId, originCity, destinationCity, budgetMinor, version |
| `trip_meetings` | 会议 | tripId, meetingDate, startTime, endTime |
| `trip_days` | 日程天 | tripId, localDate, dayType |
| `itinerary_items` | 活动项 | tripDayId, kind, title, costMinor, locked, version |
| `transport_segments` | 交通段 | itemId, mode, durationSeconds |
| `places` | 地点 POI | canonicalName, category, cityCode, lat, lng |
| `quote_searches` | 报价搜索 | tripId, productType, requestHash |
| `quotes` | 报价快照 | providerCode, totalPriceMinor, expiresAt |
| `content_sources` | 攻略来源 | sourceType, rawText, summary |
| `place_mentions` | 地点提及 | contentSourceId, placeId, confidence |
| `plan_versions` | 规划版本 | tripId, version, strategy, evidence |
| `user_events` | 用户事件 | userId, eventType, entityId |
| `cities` | 城市字典 | code, name, province |

### 5.2 导入方式

**方式一：使用 Prisma 迁移（推荐）**

```bash
# 生成迁移 SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > init.sql

# 执行 SQL
docker exec -i trip_planner_db psql -U tripplanner -d trip_planner < init.sql
```

**方式二：直接导入迁移文件**

```bash
docker cp prisma/migrations/20260718_init_v1/migration.sql trip_planner_db:/tmp/migration.sql
docker exec trip_planner_db psql -U tripplanner -d trip_planner -f /tmp/migration.sql
```

### 5.3 种子数据

导入后数据库包含：

- **15 个城市**：上海、北京、杭州、南京、苏州、昆明、成都、西安、广州、深圳、重庆、武汉、长沙、厦门、青岛
- **40 个地点**：每个城市的景点、餐厅、酒店、交通站点

```bash
docker cp prisma/seed.sql trip_planner_db:/tmp/seed.sql
docker exec trip_planner_db psql -U tripplanner -d trip_planner -f /tmp/seed.sql
```

### 5.4 重置数据库

```bash
# 删除所有表
docker exec trip_planner_db psql -U tripplanner -d trip_planner \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 重新导入表结构 + 种子数据
docker exec -i trip_planner_db psql -U tripplanner -d trip_planner \
  < prisma/migrations/20260718_init_v1/migration.sql

docker cp prisma/seed.sql trip_planner_db:/tmp/seed.sql
docker exec trip_planner_db psql -U tripplanner -d trip_planner -f /tmp/seed.sql
```

---

## 6. 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | ✅ | `postgresql://tripplanner:tripplanner_dev@localhost:5432/trip_planner?schema=public` | PostgreSQL 连接字符串 |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis 连接字符串 |
| `JWT_SECRET` | ✅ | `dev-jwt-secret-change-in-production` | JWT 签名密钥，**生产必须修改** |
| `JWT_EXPIRES_IN` | ❌ | `7d` | Token 过期时间 |
| `NODE_ENV` | ❌ | `development` | `development` / `production` |
| `PORT` | ❌ | `8080` | API 监听端口 |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000` | 允许的前端域名 |

### Docker 模式环境变量

在 `docker-compose.yml` 的 `api` 服务中直接配置，无需 `.env` 文件：

```yaml
api:
  environment:
    DATABASE_URL: "postgresql://tripplanner:tripplanner_dev@postgres:5432/trip_planner?schema=public"
    REDIS_URL: "redis://redis:6379"
    JWT_SECRET: "your-production-secret"
    JWT_EXPIRES_IN: "7d"
    NODE_ENV: "production"
    PORT: "8080"
    CORS_ORIGIN: "https://your-frontend.com"
```

> **注意：** Docker 模式中 `DATABASE_URL` 的 host 是 `postgres`（容器名），不是 `localhost`。

---

## 7. 服务验证

### 7.1 健康检查

```bash
# 检查 API 是否启动
curl -s http://localhost:8080/api/v1/places/cities | head -20

# 检查数据库连接（查询城市数量）
docker exec trip_planner_db psql -U tripplanner -d trip_planner \
  -c "SELECT count(*) FROM cities;"
```

### 7.2 完整接口测试

```bash
# 1. 注册用户
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'

# 保存返回的 accessToken
TOKEN="<accessToken>"

# 2. 获取城市列表
curl -s http://localhost:8080/api/v1/places/cities \
  -H "Authorization: Bearer $TOKEN"

# 3. 搜索地点
curl -s "http://localhost:8080/api/v1/places/search?city=杭州&category=attraction" \
  -H "Authorization: Bearer $TOKEN"

# 4. 创建旅行
curl -s -X POST http://localhost:8080/api/v1/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "originCity":"上海",
    "destinationCity":"杭州",
    "startDate":"2026-08-10",
    "endDate":"2026-08-12",
    "earliestDeparture":"2026-08-10T13:00:00+08:00",
    "latestReturn":"2026-08-12T21:00:00+08:00",
    "budgetMinor":200000,
    "hotelMaxPriceMinor":40000,
    "meetings":[{"title":"项目研讨会","meetingDate":"2026-08-11","startTime":"09:00","endTime":"12:00","location":"杭州市西湖区"}]
  }'

# 保存返回的 tripId
TRIP_ID="<tripId>"

# 5. 触发自动规划
curl -s -X POST "http://localhost:8080/api/v1/trips/$TRIP_ID/planning/plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"strategy":"balanced"}'

# 6. 获取行程详情
curl -s "http://localhost:8080/api/v1/trips/$TRIP_ID" \
  -H "Authorization: Bearer $TOKEN"

# 7. 搜索报价
curl -s -X POST "http://localhost:8080/api/v1/trips/$TRIP_ID/quotes/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productType":"train","criteria":{"from":"上海","to":"杭州"}}'
```

### 7.3 Swagger 文档

浏览器打开 **http://localhost:8080/api/docs** 即可看到完整的交互式 API 文档。

---

## 8. 常用运维命令

### 8.1 服务管理

```bash
# 启动全部服务
docker compose up -d

# 停止全部服务（保留数据）
docker compose down

# 重启 API
docker compose restart api

# 重建并重启 API（代码变更后）
docker compose up --build -d api

# 查看日志
docker logs -f trip_planner_api           # API 日志
docker logs -f trip_planner_db            # 数据库日志

# 查看实时日志（最近 50 行）
docker logs --tail 50 -f trip_planner_api
```

### 8.2 数据库操作

```bash
# 进入数据库命令行
docker exec -it trip_planner_db psql -U tripplanner -d trip_planner

# 查看表列表
\dt

# 查看表结构
\d trips

# 查询数据
SELECT * FROM trips LIMIT 5;
SELECT * FROM places WHERE city_code = 'hangzhou';

# 退出
\q
```

### 8.3 Prisma 操作

```bash
# 生成 Prisma Client
npx prisma generate

# 查看数据库状态
npx prisma migrate status

# 创建新迁移
npx prisma migrate dev --name <描述>

# 应用迁移
npx prisma migrate deploy

# 打开数据库可视化界面
npx prisma studio
```

### 8.4 数据备份与恢复

```bash
# 备份数据库
docker exec trip_planner_db pg_dump -U tripplanner trip_planner > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i trip_planner_db psql -U tripplanner -d trip_planner < backup_20260718.sql
```

### 8.5 完全重置

```bash
# 停止并删除所有容器和数据卷
docker compose down -v

# 重新构建并启动
docker compose up --build -d

# 初始化数据库（参见第 5 节）
```

---

## 9. 生产环境部署

### 9.1 安全配置

```bash
# 1. 修改 JWT 密钥（必须！）
JWT_SECRET="<使用 openssl rand -base64 32 生成的随机字符串>"

# 2. 修改数据库密码
POSTGRES_PASSWORD="<强密码>"

# 3. 配置 CORS
CORS_ORIGIN="https://your-actual-domain.com"

# 4. 设置 NODE_ENV
NODE_ENV="production"
```

### 9.2 PostgreSQL 认证

生产环境 **不要** 使用 trust 模式：

```bash
# 在容器内设置正确的认证
docker exec -u postgres trip_planner_db bash -c "
# 设置密码加密为 scram-sha-256
psql -U tripplanner -d trip_planner -c \"ALTER SYSTEM SET password_encryption = 'scram-sha-256';\"
psql -U tripplanner -d trip_planner -c \"ALTER USER tripplanner PASSWORD '<新密码>';\"
psql -U tripplanner -d trip_planner -c 'SELECT pg_reload_conf();'
"
```

更新 `.env` 和 `docker-compose.yml` 中的密码。

### 9.3 生产 docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: trip_planner_db
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: trip_planner
      POSTGRES_USER: tripplanner
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"  # 从环境变量读取
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tripplanner -d trip_planner"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: trip_planner_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build: .
    container_name: trip_planner_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: "postgresql://tripplanner:${POSTGRES_PASSWORD}@postgres:5432/trip_planner?schema=public"
      REDIS_URL: "redis://redis:6379"
      JWT_SECRET: "${JWT_SECRET}"
      JWT_EXPIRES_IN: "7d"
      NODE_ENV: "production"
      PORT: "8080"
      CORS_ORIGIN: "${CORS_ORIGIN}"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

配合 `.env`（生产环境，**不要提交到 Git**）：

```env
POSTGRES_PASSWORD=your_strong_password_here
JWT_SECRET=your_random_jwt_secret_here
CORS_ORIGIN=https://your-frontend.com
```

### 9.4 反向代理配置（Nginx）

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 10. 常见问题

### Q1: Docker 启动后 API 报 `P1000 Authentication failed`

**原因：** Windows Docker Desktop 端口转发导致的认证问题。

**解决：**
```bash
# 在容器内设置 trust 模式
docker exec -u postgres trip_planner_db bash -c "
sed -i 's/scram-sha-256/trust/g' /var/lib/postgresql/data/pg_hba.conf
pg_ctl reload -D /var/lib/postgresql/data
"
docker compose restart api
```

### Q2: Docker 构建报 `minimumReleaseAge violation`

**原因：** pnpm 供应链安全策略阻止安装新发布的包。

**解决：** 在 Dockerfile 中添加配置：
```dockerfile
RUN npm install --registry=https://registry.npmmirror.com --config.minimumReleaseAge=0
```

### Q3: Docker 构建报 `libssl.so.1.1: No such file or directory`

**原因：** Alpine 镜像不包含 OpenSSL 1.1。

**解决：** Dockerfile 使用 Debian 基础镜像：
```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
```

### Q4: Docker 构建报 `cannot replace directory with file`

**原因：** `COPY . .` 覆盖了 `node_modules` 目录。

**解决：** 确保 `.dockerignore` 包含 `node_modules`。

### Q5: 本地运行 `npm run start:dev` 报 `Cannot find module`

**原因：** 依赖未安装或 Prisma Client 未生成。

**解决：**
```bash
npm install
npx prisma generate
npm run start:dev
```

### Q6: API 返回 `TRIP_NOT_FOUND` 但行程确实存在

**原因：** Token 对应的用户和行程的 `ownerId` 不匹配。

**解决：** 确保创建行程和查询行程使用同一个用户的 Token。

### Q7: 中文在终端显示为乱码

**原因：** 终端编码不是 UTF-8。

**解决：**
- Git Bash: 确保终端使用 UTF-8
- PowerShell: `chcp 65001`
- CMD: `chcp 65001`

### Q8: 如何修改数据库表结构？

```bash
# 1. 修改 prisma/schema.prisma
# 2. 创建迁移
npx prisma migrate dev --name <描述>
# 3. Docker 模式中手动执行迁移 SQL
docker exec -i trip_planner_db psql -U tripplanner -d trip_planner \
  < prisma/migrations/<timestamp>_<name>/migration.sql
# 4. 重新生成 Prisma Client
npx prisma generate
```

---

## 快速启动清单（Checklist）

```
□ 1. 安装 Docker Desktop 并启动
□ 2. cd backend
□ 3. docker compose up --build -d
□ 4. 导入表结构 (prisma migrate diff | docker exec psql)
□ 5. 导入种子数据 (docker cp seed.sql + docker exec psql)
□ 6. curl http://localhost:8080/api/v1/places/cities  ✅
□ 7. 打开 http://localhost:8080/api/docs 查看完整文档
```

---

> **文档版本：** V1.0
> **最后更新：** 2026-07-18
> **接口文档：** [api-v1.md](./api-v1.md)
