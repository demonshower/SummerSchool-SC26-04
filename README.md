# 出差行程规划助手 — 前端

Next.js App Router 前端，对接 NestJS 后端 REST API。

当前版本已对接：**分段并行 LLM 规划、高德地图/天气、博查攻略研究、自然语言填表、地点搜索、报价比价、攻略导入** 等能力。

> 由旧版 Flask SSR（`SummerSchool-SC26-04/`）迁移而来，前后端完全分离。

---

## 目录

1. [技术栈](#1-技术栈)
2. [项目结构](#2-项目结构)
3. [环境要求](#3-环境要求)
4. [启动方式](#4-启动方式)
5. [功能与页面](#5-功能与页面)
6. [与后端能力对照](#6-与后端能力对照)
7. [API 对接约定](#7-api-对接约定)
8. [认证流程](#8-认证流程)
9. [规划流程（前端侧）](#9-规划流程前端侧)
10. [从旧 Flask 迁移](#10-从旧-flask-迁移)
11. [常用命令](#11-常用命令)
12. [常见问题](#12-常见问题)

---

## 1. 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | Bootstrap 5.3 + Bootstrap Icons |
| 数据获取 | TanStack Query v5 |
| 表单 | React Hook Form |
| 状态管理 | Zustand（认证持久化） |
| HTTP | Axios（超时 120s，自动解包 `{ data }`） |
| 工具 | date-fns |

---

## 2. 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 首页
│   │   ├── auth/login|register       # 登录 / 注册
│   │   └── trips/
│   │       ├── page.tsx              # 列表
│   │       ├── new/page.tsx          # 新建（NL 填表 + 会议地点搜索 + autoPlan）
│   │       └── [tripId]/
│   │           ├── page.tsx          # 详情（规划进度/天气/通勤/研究/比价/导入）
│   │           └── edit/page.tsx     # 编辑
│   ├── components/
│   │   ├── layout/                   # Navbar, Footer
│   │   ├── auth/                     # AuthGuard
│   │   ├── trips/NaturalLanguageInput.tsx   # 自然语言解析填表
│   │   ├── places/PlacePicker.tsx           # 高德地点搜索
│   │   ├── weather/WeatherCard.tsx          # 天气卡片
│   │   ├── planning/PlanProgress.tsx        # 规划阶段进度
│   │   ├── research/ResearchPanel.tsx       # 博查攻略研究
│   │   ├── content/GuideImporter.tsx        # 文本/链接导入
│   │   ├── quotes/QuotePanel.tsx            # 报价比价
│   │   └── itinerary/ItemEditor.tsx         # 活动项编辑
│   ├── lib/api/
│   │   ├── client.ts                 # Axios + JWT + 错误归一
│   │   ├── auth.ts / trips.ts / itinerary.ts
│   │   ├── planning.ts               # 规划 + waitUntilDone 轮询
│   │   ├── quotes.ts / content.ts / places.ts
│   │   └── research.ts               # 攻略研究
│   ├── stores/authStore.ts
│   └── types/
├── .env.local
└── package.json
```

---

## 3. 环境要求

| 依赖 | 说明 |
|------|------|
| Node.js v20+ | 推荐 v22 |
| npm v10+ | |
| 后端 API | 默认 `http://localhost:8080`，需已配置高德 / LLM / 博查等（见后端文档） |

---

## 4. 启动方式

### 4.1 启动后端

```bash
cd backend
docker compose up -d
# 首次需初始化库表与种子数据，见 backend/doc/deployment.md
curl http://localhost:8080/api/v1/providers/health
```

### 4.2 启动前端

```bash
cd frontend
npm install
# .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
npm run dev
```

浏览器打开 **http://localhost:3000**

### 4.3 生产构建

```bash
npm run build
npm start
```

---

## 5. 功能与页面

| 路径 | 功能 |
|------|------|
| `/` | 产品介绍、入口 |
| `/auth/login` | 登录 / 游客 |
| `/auth/register` | 注册 |
| `/trips` | 行程列表（状态徽章：草稿/已规划等） |
| `/trips/new` | 智能填写（NL）+ 表单 + 会议地点高德搜索 + **创建并自动规划** |
| `/trips/[id]` | 详情：规划进度、天气、通勤、AI 说明、日程、比价、导入、研究 |
| `/trips/[id]/edit` | 编辑偏好并重新规划 |

### 详情页能力

| 按钮/区域 | 能力 |
|-----------|------|
| 重新规划 | `POST .../planning/plan` 后轮询 `status`，展示 `PlanProgress` |
| 比价 | `QuotePanel`：火车/飞机/酒店/门票搜索与刷新 |
| 导入 | `GuideImporter`：文本/链接导入（后端 LLM 抽取） |
| 研究 | `ResearchPanel`：博查多查询 + 洞察地点 + 来源列表 |
| 天气 | `WeatherCard` → `GET /providers/weather` |
| 通勤 | 展示 `planVersions.evidence.routeHints` |
| 日程编辑 | 增删改、锁定活动项 |

---

## 6. 与后端能力对照

| 后端能力 | 前端入口 | 状态 |
|----------|----------|------|
| 分段并行 LLM 规划 + job 进度 | 新建 autoPlan / 详情重新规划 + PlanProgress | ✅ |
| 高德 POI / 天气 / 路线 | PlacePicker、WeatherCard、通勤列表；规划结果内嵌 | ✅ |
| ECNU LLM 解析 / 抽取 / 解释 | NL 填表、导入、方案说明 | ✅ |
| 博查攻略研究 | 详情「研究」 | ✅ |
| 报价 | 比价面板 | ✅（多为 Mock/估算票价） |
| 行程 CRUD / 日程编辑 | 列表、新建、详情、编辑 | ✅ |

接口细节见：`backend/doc/api-v1.md`、`backend/doc/providers.md`。

---

## 7. API 对接约定

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

| 约定 | 说明 |
|------|------|
| 响应 | 拦截器解包 `response.data.data` |
| 错误 | `{ error: { code, message, details } }`；校验数组会拼成中文 |
| 金额 | UI 用「元」，请求用 `*Minor` 分；`money.ts` |
| 时间 | `datetime-local` 转 `...+08:00` 再提交 |
| 超时 | 默认 120s（规划/研究较慢） |
| 认证 | `Authorization: Bearer <token>`，存 `localStorage` 键 `auth-storage` |

### 关键请求示例

**创建并自动规划：**

```json
POST /trips
{
  "originCity": "上海",
  "destinationCity": "杭州",
  "startDate": "2026-08-10",
  "endDate": "2026-08-12",
  "earliestDeparture": "2026-08-10T13:00:00+08:00",
  "latestReturn": "2026-08-12T21:00:00+08:00",
  "budgetMinor": 300000,
  "hotelMaxPriceMinor": 40000,
  "transportPreference": "train",
  "meetings": [{ "title": "项目会", "meetingDate": "2026-08-11", "startTime": "09:00", "endTime": "12:00", "location": "西湖区" }],
  "autoPlan": true,
  "planStrategy": "balanced"
}
```

**仅触发规划（异步 job）：**

```http
POST /trips/:id/planning/plan
→ { jobId, status: "queued", stages: [...] }

GET /trips/:id/planning/status
→ { tripStatus, job: { progress, stages, status } }
```

---

## 8. 认证流程

```
未登录 → AuthGuard → /auth/login
登录/注册/游客 → token 写入 Zustand + localStorage
请求自动带 Bearer
401 → 清 token → 回登录页
```

---

## 9. 规划流程（前端侧）

```text
新建页提交 (autoPlan=true)
    → 后端创建行程 + 后台分段规划 + wait 完成后返回详情
    → 跳转详情页（已有 days/items）

详情页「重新规划」
    → POST plan 立即返回 jobId
    → 每秒轮询 status，更新 PlanProgress
    → ready 后 invalidate 行程详情

旧草稿无日程进入详情
    → 自动触发一次规划轮询
```

后端阶段大致为：`context → candidates → transport/hotel → days → persist → commute → explain`。

---

## 10. 从旧 Flask 迁移

| 旧 | 新 |
|----|-----|
| Jinja SSR + 硬编码 | Next.js + 真实 API |
| 无认证 | JWT |
| 无规划 | 分段 LLM + 高德 |
| 金额「元」浮点 | 分整数 |

旧代码仅作参考，日常开发使用本目录。

---

## 11. 常用命令

```bash
npm run dev
npm run build && npm start
npm run lint
```

联调：

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Swagger | http://localhost:8080/api/docs |
| Providers 健康 | http://localhost:8080/api/v1/providers/health |

---

## 12. 常见问题

| 问题 | 处理 |
|------|------|
| 一直跳登录 | 确认后端已启动、CORS、API URL |
| 规划很久 | 正常（多段 LLM+地图）；看进度条；超时 180s |
| 会议提交失败 | 日期/开始/结束/地点须齐全，或清空该行 |
| 详情只有费用 | 点「立即规划」；新建请带 autoPlan |
| 地点/天气失败 | 检查后端高德 Web 服务 Key |
| 研究无结果 | 检查博查 Key；`providers/health` 中 bocha.enabled |

---

## 相关文档

| 文档 | 路径 |
|------|------|
| 后端接口 | `backend/doc/api-v1.md` |
| 外部服务 | `backend/doc/providers.md` |
| 部署 | `backend/doc/deployment.md` |
| 产品 V2 需求 | `docs/intelligent-travel-planning-requirements.md` |

**版本：** V1.2 · **更新：** 2026-07-18 · **分支：** `v1frontend`
