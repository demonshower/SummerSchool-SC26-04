# 出差行程规划助手 — 后端 API 文档

> Base URL: `http://localhost:8080/api/v1`  
> Swagger: `http://localhost:8080/api/docs`  
> Providers: `GET /api/v1/providers/health`

**版本：** V1.2 · **更新：** 2026-07-18 · **分支：** `v1backend`

---

## 目录

1. [通用约定](#1-通用约定)
2. [认证](#2-认证)
3. [旅行 Trips](#3-旅行-trips)
4. [行程编辑 Itinerary](#4-行程编辑-itinerary)
5. [自动规划 Planning（分段并行）](#5-自动规划-planning分段并行)
6. [报价 Quotes](#6-报价-quotes)
7. [攻略内容 Content](#7-攻略内容-content)
8. [攻略研究 Research（博查）](#8-攻略研究-research博查)
9. [地点 Places](#9-地点-places)
10. [外部服务 Providers](#10-外部服务-providers)
11. [错误码](#11-错误码)

---

## 1. 通用约定

### 1.1 认证

需登录的接口：

```http
Authorization: Bearer <accessToken>
```

### 1.2 成功响应

```json
{
  "data": { },
  "meta": {
    "requestId": "req_xxx",
    "timestamp": "2026-07-18T08:00:00.000Z"
  }
}
```

### 1.3 错误响应

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "可读错误说明；多条校验用分号拼接",
    "details": { "validation": ["..."] },
    "path": "/api/v1/trips",
    "timestamp": "..."
  }
}
```

### 1.4 金额 / 时间 / ID

| 项 | 约定 |
|----|------|
| 金额 | 整数 **分**，字段后缀 `Minor`，如 `200000` = ¥2000 |
| 时间 | ISO 8601；存 UTC，业务常用 `+08:00` 提交 |
| ID | CUID 字符串 |

---

## 2. 认证

### 2.1 注册

`POST /auth/register` — 无需认证

**Body**

| 字段 | 类型 | 必填 |
|------|------|------|
| username | string | ✅ 2–80 |
| password | string | ✅ 6–128 |
| email | string | ❌ |

**响应 `data`**

```json
{
  "user": {
    "id": "cm...",
    "username": "zhangsan",
    "email": null,
    "isGuest": false,
    "locale": "zh-CN",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "...",
    "deletedAt": null
  },
  "accessToken": "eyJ..."
}
```

### 2.2 登录

`POST /auth/login` — 无需认证

```json
{ "username": "zhangsan", "password": "password123" }
```

响应同注册。

### 2.3 游客登录

`POST /auth/guest` — 无需认证

```json
{}
```

### 2.4 当前用户

`GET /auth/me` — 🔒

返回用户对象（不含 passwordHash）。

---

## 3. 旅行 Trips

> 以下均需 🔒

### 3.1 创建旅行

`POST /trips`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| originCity | string | ✅ | 出发城市 |
| destinationCity | string | ✅ | 目的城市 |
| startDate | string | ✅ | `YYYY-MM-DD` |
| endDate | string | ✅ | `YYYY-MM-DD` |
| earliestDeparture | string | ✅ | ISO 时间 |
| latestReturn | string | ✅ | ISO 时间 |
| budgetMinor | number | ✅ | 总预算（分） |
| hotelMaxPriceMinor | number | ✅ | 酒店上限/晚（分） |
| transportPreference | string | ❌ | `any` / `flight` / `train` |
| wantsSightseeing | boolean | ❌ | 默认 true |
| attractionPreference | string | ❌ | `any` / 自然 / 人文 / 商业 / 美食 |
| pace | string | ❌ | `relaxed` / `balanced` / `intense` |
| title | string | ❌ | 默认「A → B」 |
| meetings | array | ❌ | 见下；**不完整条目会被服务端丢弃** |
| **autoPlan** | boolean | ❌ | **true 时创建后立即分段规划并等待完成，返回完整详情** |
| **planStrategy** | string | ❌ | `budget` / `balanced` / `comfort` |

**meetings[]**（建议全填；缺字段的项不会写入）

| 字段 | 说明 |
|------|------|
| title | 可选，默认「会议」 |
| meetingDate | `YYYY-MM-DD` |
| startTime | `HH:mm` |
| endTime | `HH:mm` |
| location | 地点文案 |
| address / lat / lng | 可选 |

**请求示例**

```json
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
  "wantsSightseeing": true,
  "meetings": [
    {
      "title": "项目会",
      "meetingDate": "2026-08-11",
      "startTime": "09:00",
      "endTime": "12:00",
      "location": "西湖区"
    }
  ],
  "autoPlan": true,
  "planStrategy": "balanced"
}
```

**响应（autoPlan=false）**  
返回 Trip + meetings + days（通常为空）。

**响应（autoPlan=true）**  
返回 **规划后详情**（含 days/items/costSummary/planVersions），并附加：

```json
{
  "autoPlan": {
    "status": "completed",
    "jobId": "plan_xxx",
    "stats": { "days": 3, "transport": 2, "hotels": 2, "activities": 4 },
    "explanation": { "summary": "...", "advantages": [], "risks": [] },
    "stages": []
  }
}
```

失败时仍返回行程草稿，`autoPlan.status = "failed"`。

### 3.2 列表

`GET /trips?status=&page=1&pageSize=20`

```json
{
  "items": [ /* Trip 摘要 + meetings + _count.days */ ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 3.3 详情

`GET /trips/:tripId`

含：`meetings`、`days[].items`（place / transportSegment）、`planVersions`、`costSummary`。

**costSummary**

| 字段 | 说明 |
|------|------|
| transportMinor / hotelMinor / mealMinor / commuteMinor / attractionMinor | 分类费用 |
| totalMinor / budgetMinor / remainingMinor | 汇总 |
| status | `within_budget` / `close_to_budget` / `slightly_over` / `over_budget` |

**planVersions[].evidence**（规划后）常见字段：

- `dataSources`：`planningMode: parallel_segmented_llm`、`hotel: amap+llm` 等  
- `routeHints[]`：通勤 `{ from, to, mode, distanceMeters, durationSeconds }`  
- `explanation`：LLM 方案说明  
- `weather`、`stages`、`transportChoice`、`hotelChoice`

### 3.4 更新

`PATCH /trips/:tripId`

可选：`title`、`budgetMinor`、`transportPreference`、`hotelMaxPriceMinor`、`wantsSightseeing`、`attractionPreference`、`pace`、`version`（乐观锁）。

### 3.5 删除

`DELETE /trips/:tripId` → `{ "success": true }`

---

## 4. 行程编辑 Itinerary

> 🔒 前缀 `/trips/:tripId`

### 4.1 获取日程

`GET /trips/:tripId/days`

返回天列表 + `items`（含 place、transportSegment）。

**dayType：** `departure` | `meeting_day` | `return` | `free`  
**item.kind：** `transport` | `commute` | `hotel` | `meal` | `attraction` | `meeting` | `fixed` | `free_time`

### 4.2 新增活动

`POST /trips/:tripId/items`

| 字段 | 必填 |
|------|------|
| dayId | ✅ |
| kind | ✅ |
| title | ✅ |
| subtitle / position / startAt / endAt / placeId / locationText / costMinor / note / icon / isFixed | ❌ |

### 4.3 修改 / 删除 / 移动 / 锁定 / 排序

| 方法 | 路径 |
|------|------|
| PATCH | `/trips/:tripId/items/:itemId` |
| DELETE | `/trips/:tripId/items/:itemId`（锁定/固定不可删） |
| POST | `/trips/:tripId/items/:itemId/move` body: `{ toDayId, beforeItemId?, position?, baseVersion }` |
| POST | `/trips/:tripId/items/:itemId/lock` body: `{ locked: true\|false }` |
| POST | `/trips/:tripId/items/reorder` body: `{ items: [{id, position}], baseVersion }` |

---

## 5. 自动规划 Planning（分段并行）

> 🔒 前缀 `/trips/:tripId/planning`

规划采用 **多阶段并行**，**不会**一次让 LLM 输出全部行程：

```text
context     → 天气
candidates  → 并行：酒店/景点/餐饮 POI（高德）
transport   → LLM 选城际方式          ┐ 并行
hotel       → LLM 从候选选酒店        ┘
days        → 每一天单独 LLM 编排（天之间并行）
persist     → 写库
commute     → 高德相邻活动通勤
explain     → LLM 方案解释
```

城际票价多为 **估算**（无企业 12306/OTA 时）。

### 5.1 触发规划

`POST /trips/:tripId/planning/plan`

```json
{ "strategy": "balanced", "useTravelProfile": false, "lockedItemIds": [] }
```

**立即返回（异步任务）：**

```json
{
  "jobId": "plan_cmxxx_1784...",
  "status": "queued",
  "progress": 0,
  "stages": [
    { "key": "context", "label": "采集天气与上下文", "status": "pending" },
    { "key": "candidates", "label": "并行检索酒店/景点/餐饮", "status": "pending" },
    { "key": "transport", "label": "LLM 选择城际交通", "status": "pending" },
    { "key": "hotel", "label": "LLM 选择酒店", "status": "pending" },
    { "key": "days", "label": "并行 LLM 编排每日行程", "status": "pending" },
    { "key": "commute", "label": "高德通勤校验", "status": "pending" },
    { "key": "explain", "label": "LLM 方案解释", "status": "pending" },
    { "key": "persist", "label": "写入日程", "status": "pending" }
  ],
  "message": "规划任务已提交，请轮询 /planning/status"
}
```

`stage.status`：`pending` | `running` | `completed` | `failed` | `skipped`

### 5.2 查询状态

`GET /trips/:tripId/planning/status`

```json
{
  "tripStatus": "planning",
  "version": 2,
  "job": {
    "jobId": "plan_...",
    "status": "running",
    "progress": 50,
    "stages": [ /* 同上，带 message/startedAt/finishedAt */ ],
    "error": null,
    "updatedAt": "..."
  }
}
```

`tripStatus` 完成后为 `ready`；`job.status` 为 `completed` / `failed`。

### 5.3 按 jobId 查询

`GET /trips/:tripId/planning/jobs/:jobId`

### 5.4 规划结果

`GET /trips/:tripId/planning/result`  
（行程 + days + planVersions，类似详情）

### 5.5 应用版本

`POST /trips/:tripId/planning/apply`  
`{ "version": 2 }`

---

## 6. 报价 Quotes

> 🔒

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/trips/:tripId/quotes/search` | 搜索；body: `{ productType, criteria, providerCodes? }` |
| GET | `/trips/:tripId/quotes?productType=` | 列表 |
| POST | `/quotes/:quoteId/refresh` | 刷新 |
| POST | `/quotes/:quoteId/clickout` | 深链 + 埋点 |

`productType`：`flight` | `train` | `hotel` | `ticket`  

**说明：** 当前多为 Mock/估算，非企业 OTA 实时库存。字段含 `providerCode`、`totalPriceMinor`、`comparableKey`、`conditions`、`expiresAt` 等。

---

## 7. 攻略内容 Content

> 🔒 前缀 `/content`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/content/imports/text` | 文本导入；优先 **LLM 抽取**，失败关键词回退；高德消歧 |
| POST | `/content/imports/link` | 仅元数据 |
| GET | `/content/sources/:sourceId` | 抽取结果 + mentions |
| GET | `/content/trips/:tripId/sources` | 行程关联来源 |
| DELETE | `/content/sources/:sourceId` | 删除 |
| POST | `/content/mentions/:mentionId/resolve` | `{ placeId }` 确认映射 |

**imports/text Body**

```json
{ "rawText": "...", "title": "可选", "tripId": "可选" }
```

**响应增加**

```json
{
  "id": "...",
  "status": "completed",
  "extractMethod": "llm",
  "extractedCount": 3,
  "places": [
    {
      "mention": "西湖",
      "suggestedDurationMinutes": 180,
      "suggestedPeriod": "afternoon",
      "sentiment": "positive",
      "confidence": 0.9,
      "tips": [],
      "evidence": "..."
    }
  ]
}
```

---

## 8. 攻略研究 Research（博查）

> 🔒

### 8.1 网页搜索

`POST /research/web-search`

```json
{
  "query": "杭州 三日游 攻略",
  "freshness": "oneYear",
  "summary": true,
  "count": 8,
  "site": "xiaohongshu.com"
}
```

**响应（规范化）**

```json
{
  "provider": "bocha",
  "query": "...",
  "originalQuery": "...",
  "webSearchUrl": "...",
  "totalEstimatedMatches": 10000000,
  "pages": [
    {
      "id": "...",
      "name": "标题",
      "url": "https://...",
      "snippet": "...",
      "summary": "...",
      "siteName": "搜狐",
      "datePublished": "..."
    }
  ],
  "observedAt": "..."
}
```

### 8.2 行程研究

`POST /trips/:tripId/research`

| 字段 | 默认 | 说明 |
|------|------|------|
| queries | 自动生成 | 自定义检索词 |
| countPerQuery | 5 | 每组条数 |
| maxQueries | 4 | 最多几组 |
| extractInsights | true | LLM/关键词抽地点 |
| persist | true | 写入 ContentSource |
| freshness | oneYear | |

**响应要点**

```json
{
  "tripId": "...",
  "provider": "bocha",
  "queries": ["杭州 3日游 攻略 8月", "..."],
  "totalSources": 9,
  "searchResults": [{ "query": "...", "pageCount": 3, "pages": [] }],
  "sources": [ /* 去重后的 pages */ ],
  "insights": {
    "extractMethod": "llm+keyword",
    "placeCount": 9,
    "places": [{ "mention": "西湖", "resolvedAmap": { "name": "..." } }]
  },
  "contentSourceId": "cm...",
  "observedAt": "..."
}
```

### 8.3 来源列表

`GET /trips/:tripId/research/sources`

### 8.4 洞察聚合

`GET /trips/:tripId/research/insights`

```json
{
  "tripId": "...",
  "destinationCity": "杭州",
  "sourceCount": 1,
  "webResearchRuns": [],
  "uniquePlaces": [],
  "allMentions": []
}
```

---

## 9. 地点 Places

### 9.1 搜索（本地 + 高德 live）

`GET /places/search?city=&q=&category=&limit=20`  
部分接口无需登录。

**响应**

```json
{
  "local": [ /* DB Place */ ],
  "live": [
    {
      "id": "amap_xxx",
      "canonicalName": "灵隐寺",
      "category": "attraction",
      "cityName": "杭州",
      "address": "...",
      "lat": 30.24,
      "lng": 120.10,
      "attributes": { "source": "amap", "live": true },
      "source": "amap"
    }
  ],
  "total": 21
}
```

`category`：`attraction` | `restaurant` | `hotel` | `station` | `shopping`

### 9.2 城市列表

`GET /places/cities` — 无需认证

### 9.3 详情

`GET /places/:placeId`

---

## 10. 外部服务 Providers

调试与工具接口。密钥仅环境变量，不在响应中返回。

### 10.1 健康检查

`GET /providers/health` — 无需认证

```json
{
  "llm": { "enabled": true, "provider": "ecnu", "baseUrl": "...", "model": "ecnu-plus" },
  "amap": { "enabled": true, "provider": "amap" },
  "weather": { "enabled": true, "provider": "amap" },
  "bocha": { "enabled": true, "provider": "bocha", "baseUrl": "https://api.bochaai.com/v1" }
}
```

### 10.2 地图 / 天气

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/providers/weather?city=杭州` | 实时 + 预报 |
| GET | `/providers/geocode?address=&city=` | 地理编码 |
| GET | `/providers/poi?q=&city=&types=` | POI |
| GET | `/providers/route?origin=lng,lat&destination=lng,lat&city=&mode=` | `walking`/`driving`/`transit`/智能 |

高德 Key 须为 **Web 服务** 类型，否则 `USERKEY_PLAT_NOMATCH`。

### 10.3 搜索 / AI

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/providers/search/web` | 博查调试（body: query, count, freshness, site） |
| POST | `/providers/ai/parse-request` | `{ "text": "..." }` → 结构化行程字段 |
| POST | `/providers/ai/extract-places` | `{ "text", "city?" }` → places[] |
| POST | `/providers/ai/chat` | `{ "prompt" }` 原始对话 |

环境变量见 `doc/providers.md`、`.env.example`。

---

## 11. 错误码

| HTTP | code | 场景 |
|------|------|------|
| 400 | INVALID_INPUT | 参数校验失败 |
| 400 | INVALID_TRIP_WINDOW | 日期不合法 |
| 401 | INVALID_CREDENTIALS / UNAUTHORIZED | 登录失败 / 无 Token |
| 404 | TRIP_NOT_FOUND / ITEM_NOT_FOUND / … | 资源不存在 |
| 409 | USER_ALREADY_EXISTS | 用户名冲突 |
| 409 | TRIP_VERSION_CONFLICT | 乐观锁 |
| 409 | ITINERARY_TIME_CONFLICT | 锁定/固定项冲突 |
| 422 | PLAN_INFEASIBLE | 规划不可行（预留） |

---

## 接口一览（速查）

| 模块 | 方法 | 路径 |
|------|------|------|
| 认证 | POST | `/auth/register` `/auth/login` `/auth/guest` |
| | GET | `/auth/me` |
| 旅行 | POST | `/trips`（支持 autoPlan） |
| | GET | `/trips` `/trips/:id` |
| | PATCH/DELETE | `/trips/:id` |
| 日程 | GET | `/trips/:id/days` |
| | POST/PATCH/DELETE | `/trips/:id/items...` |
| 规划 | POST | `/trips/:id/planning/plan` |
| | GET | `/trips/:id/planning/status` `/jobs/:jobId` `/result` |
| | POST | `/trips/:id/planning/apply` |
| 报价 | POST/GET | `/trips/:id/quotes...` `/quotes/:id/...` |
| 内容 | POST/GET/DELETE | `/content/...` |
| 研究 | POST | `/research/web-search` `/trips/:id/research` |
| | GET | `/trips/:id/research/sources` `/insights` |
| 地点 | GET | `/places/search` `/cities` `/:id` |
| 外部 | GET/POST | `/providers/...` |

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [providers.md](./providers.md) | 高德 / LLM / 博查配置与排错 |
| [deployment.md](./deployment.md) | Docker / 本地启动 |
| 前端 README | `frontend/README.md` |

> Swagger 与代码冲突时，以运行中的 `/api/docs` 与 Controller 为准。
