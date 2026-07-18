# 出差行程规划助手 — 前端

Next.js App Router 前端，对接 NestJS 后端 REST API，实现出差行程的创建、自动规划、编辑、报价比价与攻略导入。

> 由旧版 Flask SSR 前端（`SummerSchool-SC26-04/`）迁移而来，前后端完全分离。

---

## 目录

1. [技术栈](#1-技术栈)
2. [项目结构](#2-项目结构)
3. [环境要求](#3-环境要求)
4. [启动方式](#4-启动方式)
5. [从旧 Flask 前端迁移说明](#5-从旧-flask-前端迁移说明)
6. [功能与页面](#6-功能与页面)
7. [API 对接约定](#7-api-对接约定)
8. [认证流程](#8-认证流程)
9. [常用命令](#9-常用命令)
10. [常见问题](#10-常见问题)

---

## 1. 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | Bootstrap 5.3 + Bootstrap Icons |
| 数据获取 | TanStack Query v5 |
| 表单 | React Hook Form |
| 状态管理 | Zustand（认证状态持久化） |
| HTTP | Axios |
| 工具 | date-fns |

---

## 2. 项目结构

```
frontend/
├── src/
│   ├── app/                          # 页面路由 (App Router)
│   │   ├── layout.tsx                # 根布局 (Bootstrap + Providers)
│   │   ├── page.tsx                  # 首页 /
│   │   ├── globals.css               # 全局样式
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # 登录
│   │   │   └── register/page.tsx     # 注册
│   │   └── trips/
│   │       ├── page.tsx              # 行程列表
│   │       ├── new/page.tsx          # 新建行程
│   │       └── [tripId]/
│   │           ├── page.tsx          # 行程详情
│   │           └── edit/page.tsx     # 编辑行程
│   │
│   ├── components/
│   │   ├── layout/                   # Navbar, Footer, BootstrapClient
│   │   ├── auth/                     # AuthGuard
│   │   ├── quotes/                   # QuotePanel 报价比价
│   │   ├── content/                  # GuideImporter 攻略导入
│   │   └── itinerary/                # ItemEditor 活动项编辑
│   │
│   ├── lib/
│   │   ├── api/                      # API 客户端层
│   │   │   ├── client.ts             # Axios 实例 / JWT / 错误处理
│   │   │   ├── auth.ts
│   │   │   ├── trips.ts
│   │   │   ├── itinerary.ts
│   │   │   ├── planning.ts
│   │   │   ├── quotes.ts
│   │   │   ├── content.ts
│   │   │   └── places.ts
│   │   └── utils/
│   │       ├── money.ts              # 分 ↔ 元
│   │       └── date.ts               # 日期格式化
│   │
│   ├── stores/
│   │   └── authStore.ts              # 认证状态 (Zustand + localStorage)
│   ├── types/                        # TypeScript 类型
│   └── providers/
│       └── QueryProvider.tsx         # TanStack Query
│
├── .env.local                        # 环境变量 (不入库)
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## 3. 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | v20+ | 推荐 v22 LTS |
| npm | v10+ | 随 Node.js 安装 |
| 后端 API | — | 需先启动 NestJS 后端（默认 `http://localhost:8080`） |

---

## 4. 启动方式

### 4.1 前置：启动后端

前端依赖后端 API，请先在另一个终端启动后端：

```bash
cd backend
docker compose up -d
# 若首次启动，还需初始化数据库（见 backend/doc/deployment.md）
```

验证后端：

```bash
curl http://localhost:8080/api/v1/places/cities
# 应返回 15 个城市的 JSON
```

### 4.2 安装依赖

```bash
cd frontend
npm install
```

### 4.3 配置环境变量

项目已包含 `.env.local`，默认内容：

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

如后端地址不同，请修改该文件。

### 4.4 开发模式启动

```bash
npm run dev
```

浏览器访问：**http://localhost:3000**

### 4.5 生产构建

```bash
npm run build
npm start
```

---

## 5. 从旧 Flask 前端迁移说明

### 5.1 背景

旧前端位于 `SummerSchool-SC26-04/`（Flask + Jinja2 SSR），存在以下问题：

- 全部页面硬编码数据，无真实 API
- 无用户认证
- 无法对接 NestJS 后端
- 前后端耦合，无法独立部署

新前端位于 `frontend/`，已完整迁移并扩展。

### 5.2 页面对照表

| 旧 Flask 路由 | 新 Next.js 路由 | 变化 |
|--------------|----------------|------|
| `GET /` | `/` | 保留 Hero + 功能卡片，按钮按登录状态跳转 |
| — | `/auth/login` | **新增** 登录 + 游客模式 |
| — | `/auth/register` | **新增** 注册 |
| `GET /trips` | `/trips` | 从硬编码改为 `GET /api/v1/trips` |
| `GET /trips/new` | `/trips/new` | 表单字段对齐后端 DTO，金额改用「分」 |
| `POST /trips` | （前端调 API） | 创建后跳转详情，可触发自动规划 |
| `GET /trips/:id` | `/trips/[tripId]` | 真实数据 + 时间线 + 费用汇总 |
| `GET /trips/:id/edit` | `/trips/[tripId]/edit` | 预填表单 + 保存/重新规划 |
| — | 详情页内「比价」 | **新增** 报价搜索/刷新/深链 |
| — | 详情页内「攻略」 | **新增** 文本/链接导入与地点抽取 |
| — | 详情页内活动项编辑 | **新增** 增删改、锁定/解锁 |

### 5.3 数据字段映射

| 旧前端字段 | 新前端 / 后端字段 | 说明 |
|-----------|------------------|------|
| `origin_city` | `originCity` | 驼峰命名 |
| `destination_city` | `destinationCity` | |
| `budget`（元） | `budgetMinor`（分） | UI 仍显示元，提交时 ×100 |
| `hotel_max_price` | `hotelMaxPriceMinor` | 同上 |
| `transport_preference: "高铁"` | `"train"` | 使用英文枚举 |
| `pace: "轻松"` | `"relaxed"` | `relaxed` / `balanced` / `intense` |
| `meeting_dates[]` 等 | `meetings: [{ title, meetingDate, startTime, endTime, location }]` | 结构化对象数组 |

### 5.4 技术迁移要点

| 项 | 旧方案 | 新方案 |
|----|--------|--------|
| 渲染 | Jinja2 服务端渲染 | Next.js 客户端组件 + API |
| 状态 | 无 | Zustand（认证）+ TanStack Query（服务端数据） |
| 表单 | 原生 form POST | React Hook Form |
| 样式 | Bootstrap CDN | Bootstrap npm 包 |
| 认证 | 无 | JWT Bearer，localStorage 持久化 |
| 金额 | 浮点「元」 | 整数「分」，工具函数转换 |
| 部署 | 与后端同进程 | 独立端口 `:3000`，CORS 跨域 |

### 5.5 迁移后旧前端如何处理

- 旧 Flask 代码仍保留在 `SummerSchool-SC26-04/`，仅作参考
- **日常开发与演示请使用 `frontend/`**
- 后端文档：`backend/doc/api-v1.md`、`backend/doc/deployment.md`

---

## 6. 功能与页面

### 6.1 页面一览

| 路径 | 功能 | 需登录 |
|------|------|--------|
| `/` | 首页：产品介绍、开始规划 | 否 |
| `/auth/login` | 登录 / 游客模式 | 否 |
| `/auth/register` | 注册 | 否 |
| `/trips` | 历史行程列表 | 是 |
| `/trips/new` | 新建行程表单（城市、日期、预算、会议） | 是 |
| `/trips/[id]` | 行程详情：时间线、费用、规划、比价、攻略、活动项编辑 | 是 |
| `/trips/[id]/edit` | 编辑行程偏好并保存 / 重新规划 | 是 |

### 6.2 详情页能力

- **重新规划**：调用自动规划引擎，生成交通/酒店/活动时间线
- **报价比价**：火车 / 飞机 / 酒店 / 门票，多平台 Mock 报价对比、刷新、跳转预订
- **攻略导入**：粘贴文本或链接，抽取地点（置信度、情感、建议时长）
- **活动项**：按天新增 / 编辑 / 删除 / 锁定 / 解锁

### 6.3 API 覆盖（33 个接口）

| 模块 | 覆盖 |
|------|------|
| 认证 (4) | ✅ 注册 / 登录 / 游客 / 当前用户 |
| 旅行 (5) | ✅ CRUD + 列表 |
| 行程编辑 (7) | ✅ 增删改 / 锁定等 |
| 自动规划 (4) | ✅ 触发规划 |
| 报价 (4) | ✅ 搜索 / 列表 / 刷新 / 深链 |
| 攻略 (6) | ✅ 文本导入 / 链接导入 / 结果展示 |
| 地点 (3) | ✅ 城市列表（表单下拉） |

---

## 7. API 对接约定

### 7.1 基础配置

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 7.2 响应解包

后端统一返回：

```json
{ "data": { ... }, "meta": { "requestId": "...", "timestamp": "..." } }
```

Axios 拦截器自动解包为业务数据 `data`，页面代码直接使用对象字段。

### 7.3 错误格式

```json
{ "error": { "code": "TRIP_NOT_FOUND", "message": "..." } }
```

401 时自动清除 token 并跳转 `/auth/login`。

### 7.4 金额

| 层 | 单位 | 示例 |
|----|------|------|
| UI 展示 / 输入 | 元 | `¥2000` |
| API 传输 | 分（整数） | `200000` |

工具函数：`src/lib/utils/money.ts`（`fenToYuan` / `yuanToFen` / `formatMoney`）。

---

## 8. 认证流程

```
未登录访问 /trips
    → AuthGuard 拦截
    → /auth/login

登录 / 注册 / 游客登录
    → 获得 accessToken + user
    → Zustand 写入 localStorage (auth-storage)
    → 跳转 /trips

后续请求
    → Axios 拦截器附加 Authorization: Bearer <token>

401
    → 清除本地认证
    → 跳转 /auth/login
```

---

## 9. 常用命令

```bash
# 开发
npm run dev          # http://localhost:3000

# 构建与生产启动
npm run build
npm start

# 代码检查
npm run lint
```

### 与后端联调

```bash
# 终端 1 — 后端
cd backend && docker compose up -d

# 终端 2 — 前端
cd frontend && npm run dev
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8080/api/v1 |
| Swagger | http://localhost:8080/api/docs |

---

## 10. 常见问题

### Q1: 页面一直跳转到登录

确认：

1. 后端是否已启动（`http://localhost:8080/api/v1/places/cities`）
2. `.env.local` 中 `NEXT_PUBLIC_API_URL` 是否正确
3. 浏览器控制台是否有 CORS / 网络错误

### Q2: 注册/登录成功但刷新后丢失

认证依赖 `localStorage` 的 `auth-storage`。请勿使用隐私模式或手动清空存储。

### Q3: 创建行程后详情为空

创建后需在详情页点击 **「重新规划」**，才会生成每日时间线与费用汇总。

### Q4: 报价/攻略按钮无数据

- 报价为 Mock 数据，需先点 **「搜索报价」**
- 攻略导入需粘贴包含已知地点名（如西湖、灵隐寺）的中文文本

### Q5: 端口 3000 被占用

```bash
# 使用其他端口
npx next dev -p 3001
```

并相应调整后端 CORS（`CORS_ORIGIN`）。

### Q6: 构建失败

```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## 快速启动清单

```
□ 1. 后端已启动 (docker compose up -d)
□ 2. cd frontend && npm install
□ 3. 确认 .env.local 中 API 地址
□ 4. npm run dev
□ 5. 打开 http://localhost:3000
□ 6. 注册 / 登录 → 新建行程 → 重新规划 → 查看详情
```

---

## 相关文档

| 文档 | 路径 |
|------|------|
| 后端接口文档 | `backend/doc/api-v1.md` |
| 后端部署指南 | `backend/doc/deployment.md` |
| 产品设计文档 | `docs/` |

---

**版本：** V1.0  
**最后更新：** 2026-07-18
