# 出差行程规划助手 — V1 后端接口文档

> Base URL: `http://localhost:8080/api/v1`
> Swagger: `http://localhost:8080/api/docs`

---

## 目录

1. [通用约定](#1-通用约定)
2. [认证模块](#2-认证模块)
3. [旅行模块](#3-旅行模块)
4. [行程编辑模块](#4-行程编辑模块)
5. [自动规划模块](#5-自动规划模块)
6. [报价比价模块](#6-报价比价模块)
7. [攻略内容模块](#7-攻略内容模块)
8. [地点模块](#8-地点模块)
9. [错误码](#9-错误码)

---

## 1. 通用约定

### 1.1 认证方式

需要认证的接口必须在请求头中携带 JWT Token：

```
Authorization: Bearer <accessToken>
```

### 1.2 统一响应格式

所有接口返回统一 JSON 结构：

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_1784343654927_2y10ig",
    "timestamp": "2026-07-18T03:00:54.942Z"
  }
}
```

### 1.3 统一错误格式

```json
{
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip 'xxx' not found",
    "details": { "entity": "Trip", "id": "xxx" },
    "path": "/api/v1/trips/xxx",
    "timestamp": "2026-07-18T03:00:00.000Z"
  }
}
```

### 1.4 金额约定

- 所有金额字段以 **分（最小货币单位）** 为单位的整数
- 字段名后缀为 `Minor`，如 `budgetMinor: 200000` 表示 ¥2000.00
- 前端展示时除以 100

### 1.5 时间约定

- 日期时间使用 ISO 8601 格式，UTC 存储
- 如 `2026-08-10T05:00:00.000Z` 对应北京时间 `2026-08-10 13:00:00`

### 1.6 ID 约定

- 所有 ID 使用 CUID 格式，如 `cmrps5f8h0000yon3baj2cy1j`

---

## 2. 认证模块

### 2.1 用户注册

**`POST /auth/register`** — 无需认证

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 用户名，2-80 字符 |
| `password` | string | ✅ | 密码，6-128 字符 |
| `email` | string | ❌ | 邮箱 |

**请求示例：**

```json
{
  "username": "zhangsan",
  "password": "password123",
  "email": "zhangsan@example.com"
}
```

**响应示例：**

```json
{
  "data": {
    "user": {
      "id": "cmrps5f8h0000yon3baj2cy1j",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "isGuest": false,
      "locale": "zh-CN",
      "status": "active",
      "createdAt": "2026-07-18T03:01:09.858Z",
      "updatedAt": "2026-07-18T03:01:09.858Z",
      "deletedAt": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": { "requestId": "req_xxx", "timestamp": "2026-07-18T03:01:09.867Z" }
}
```

---

### 2.2 用户登录

**`POST /auth/login`** — 无需认证

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 用户名 |
| `password` | string | ✅ | 密码 |

**请求示例：**

```json
{
  "username": "zhangsan",
  "password": "password123"
}
```

**响应示例：**

```json
{
  "data": {
    "user": {
      "id": "cmrps5f8h0000yon3baj2cy1j",
      "username": "zhangsan",
      "email": null,
      "isGuest": false,
      "locale": "zh-CN",
      "status": "active",
      "createdAt": "2026-07-18T03:01:09.858Z",
      "updatedAt": "2026-07-18T03:01:09.858Z",
      "deletedAt": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 2.3 游客登录

**`POST /auth/guest`** — 无需认证

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | ❌ | 游客用户名，不传则自动生成 |

**请求示例：**

```json
{}
```

**响应示例：**

```json
{
  "data": {
    "user": {
      "id": "cmrps7000000guest00000001",
      "username": "guest_1784343669_abc123",
      "email": null,
      "isGuest": true,
      "locale": "zh-CN",
      "status": "active",
      "createdAt": "2026-07-18T03:01:09.858Z",
      "updatedAt": "2026-07-18T03:01:09.858Z",
      "deletedAt": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 2.4 获取当前用户

**`GET /auth/me`** — 🔒 需要认证

**请求头：**

```
Authorization: Bearer <accessToken>
```

**响应示例：**

```json
{
  "data": {
    "id": "cmrps5f8h0000yon3baj2cy1j",
    "username": "testuser",
    "email": null,
    "isGuest": false,
    "locale": "zh-CN",
    "status": "active",
    "createdAt": "2026-07-18T03:01:09.858Z",
    "updatedAt": "2026-07-18T03:01:09.858Z",
    "deletedAt": null
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 3. 旅行模块

> 🔒 以下接口均需要认证

### 3.1 创建旅行

**`POST /trips`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `originCity` | string | ✅ | 出发城市，如 `"上海"` |
| `destinationCity` | string | ✅ | 目的城市，如 `"杭州"` |
| `startDate` | string | ✅ | 出发日期，如 `"2026-08-10"` |
| `endDate` | string | ✅ | 返回日期，如 `"2026-08-12"` |
| `earliestDeparture` | string | ✅ | 最早出发时间 ISO 8601 |
| `latestReturn` | string | ✅ | 最晚返程时间 ISO 8601 |
| `budgetMinor` | number | ✅ | 总预算（分），如 `200000` = ¥2000 |
| `hotelMaxPriceMinor` | number | ✅ | 酒店最高价/晚（分） |
| `transportPreference` | string | ❌ | 交通偏好：`"any"` / `"flight"` / `"train"`，默认 `"any"` |
| `wantsSightseeing` | boolean | ❌ | 是否安排游玩，默认 `true` |
| `attractionPreference` | string | ❌ | 景点偏好：`"any"` / `"自然"` / `"人文"` / `"商业"` / `"美食"` |
| `pace` | string | ❌ | 行程节奏：`"relaxed"` / `"balanced"` / `"intense"`，默认 `"balanced"` |
| `title` | string | ❌ | 行程标题，不传则自动生成 |
| `meetings` | array | ❌ | 会议列表，见下方 |

**meetings 子对象：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 会议标题 |
| `meetingDate` | string | ✅ | 会议日期 `"YYYY-MM-DD"` |
| `startTime` | string | ✅ | 开始时间 `"HH:mm"` |
| `endTime` | string | ✅ | 结束时间 `"HH:mm"` |
| `location` | string | ✅ | 会议地点 |
| `address` | string | ❌ | 详细地址 |
| `lat` | number | ❌ | 纬度 |
| `lng` | number | ❌ | 经度 |

**请求示例：**

```json
{
  "originCity": "上海",
  "destinationCity": "杭州",
  "startDate": "2026-08-10",
  "endDate": "2026-08-12",
  "earliestDeparture": "2026-08-10T13:00:00+08:00",
  "latestReturn": "2026-08-12T21:00:00+08:00",
  "budgetMinor": 200000,
  "hotelMaxPriceMinor": 40000,
  "transportPreference": "train",
  "wantsSightseeing": true,
  "attractionPreference": "自然",
  "pace": "relaxed",
  "meetings": [
    {
      "title": "项目研讨会",
      "meetingDate": "2026-08-11",
      "startTime": "09:00",
      "endTime": "12:00",
      "location": "杭州市西湖区"
    }
  ]
}
```

**响应示例：**

```json
{
  "data": {
    "id": "cmrps5fmh0002yon3s8bg02ny",
    "ownerId": "cmrps5f8h0000yon3baj2cy1j",
    "title": "上海 → 杭州",
    "originCity": "上海",
    "destinationCity": "杭州",
    "startDate": "2026-08-10T00:00:00.000Z",
    "endDate": "2026-08-12T00:00:00.000Z",
    "earliestDeparture": "2026-08-10T05:00:00.000Z",
    "latestReturn": "2026-08-12T13:00:00.000Z",
    "budgetMinor": 200000,
    "transportPreference": "train",
    "hotelMaxPriceMinor": 40000,
    "wantsSightseeing": true,
    "attractionPreference": "自然",
    "pace": "relaxed",
    "status": "draft",
    "version": 1,
    "timezone": "Asia/Shanghai",
    "currency": "CNY",
    "createdAt": "2026-07-18T03:01:10.362Z",
    "updatedAt": "2026-07-18T03:01:10.362Z",
    "meetings": [
      {
        "id": "cmrps5fmi0003yon3vbl2z8q1",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "title": "项目研讨会",
        "meetingDate": "2026-08-11T00:00:00.000Z",
        "startTime": "09:00",
        "endTime": "12:00",
        "location": "杭州市西湖区",
        "address": null,
        "lat": null,
        "lng": null,
        "note": null,
        "createdAt": "2026-07-18T03:01:10.362Z",
        "updatedAt": "2026-07-18T03:01:10.362Z"
      }
    ],
    "days": []
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 3.2 获取行程列表

**`GET /trips`**

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | ❌ | 筛选状态：`draft` / `planning` / `ready` / `confirmed` / `archived` |
| `page` | number | ❌ | 页码，默认 `1` |
| `pageSize` | number | ❌ | 每页数量，默认 `20` |

**响应示例：**

```json
{
  "data": {
    "items": [
      {
        "id": "cmrps5fmh0002yon3s8bg02ny",
        "ownerId": "cmrps5f8h0000yon3baj2cy1j",
        "title": "上海 → 杭州",
        "originCity": "上海",
        "destinationCity": "杭州",
        "startDate": "2026-08-10T00:00:00.000Z",
        "endDate": "2026-08-12T00:00:00.000Z",
        "budgetMinor": 200000,
        "transportPreference": "any",
        "hotelMaxPriceMinor": 40000,
        "wantsSightseeing": true,
        "attractionPreference": "any",
        "pace": "balanced",
        "status": "ready",
        "version": 2,
        "timezone": "Asia/Shanghai",
        "currency": "CNY",
        "createdAt": "2026-07-18T03:01:10.362Z",
        "updatedAt": "2026-07-18T03:01:40.518Z",
        "meetings": [
          {
            "id": "cmrps5fmi0003yon3vbl2z8q1",
            "title": "项目研讨会",
            "meetingDate": "2026-08-11T00:00:00.000Z"
          }
        ],
        "_count": { "days": 3 }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 3.3 获取行程详情

**`GET /trips/:tripId`**

**路径参数：**

| 参数 | 说明 |
|------|------|
| `tripId` | 旅行 ID |

**响应示例：**

```json
{
  "data": {
    "id": "cmrps5fmh0002yon3s8bg02ny",
    "ownerId": "cmrps5f8h0000yon3baj2cy1j",
    "title": "上海 → 杭州",
    "originCity": "上海",
    "destinationCity": "杭州",
    "startDate": "2026-08-10T00:00:00.000Z",
    "endDate": "2026-08-12T00:00:00.000Z",
    "earliestDeparture": "2026-08-10T05:00:00.000Z",
    "latestReturn": "2026-08-12T13:00:00.000Z",
    "budgetMinor": 200000,
    "transportPreference": "any",
    "hotelMaxPriceMinor": 40000,
    "wantsSightseeing": true,
    "attractionPreference": "any",
    "pace": "balanced",
    "status": "ready",
    "version": 2,
    "timezone": "Asia/Shanghai",
    "currency": "CNY",
    "createdAt": "2026-07-18T03:01:10.362Z",
    "updatedAt": "2026-07-18T03:01:40.518Z",
    "meetings": [
      {
        "id": "cmrps5fmi0003yon3vbl2z8q1",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "title": "项目研讨会",
        "meetingDate": "2026-08-11T00:00:00.000Z",
        "startTime": "09:00",
        "endTime": "12:00",
        "location": "杭州市西湖区",
        "address": null, "lat": null, "lng": null, "note": null,
        "createdAt": "2026-07-18T03:01:10.362Z",
        "updatedAt": "2026-07-18T03:01:10.362Z"
      }
    ],
    "days": [
      {
        "id": "cmrps62ud0005yon3zpn3shlb",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "localDate": "2026-08-10T00:00:00.000Z",
        "dayType": "departure",
        "budgetMinor": 0,
        "totalCostMinor": 0,
        "startPlaceId": null,
        "endPlaceId": null,
        "weatherSummary": null,
        "items": [
          {
            "id": "cmrps62uz000byon3exuffv1a",
            "tripDayId": "cmrps62ud0005yon3zpn3shlb",
            "kind": "transport",
            "title": "上海 → 杭州",
            "subtitle": "G7311",
            "position": 0,
            "startAt": "2026-08-10T14:30:00.000Z",
            "endAt": "2026-08-10T16:15:00.000Z",
            "placeId": null,
            "locationText": "上海站 → 杭州站",
            "costMinor": 12000,
            "locked": false,
            "isFixed": false,
            "note": null,
            "icon": "bi-train-front",
            "status": "estimated",
            "sourceType": "system",
            "version": 1,
            "createdAt": "2026-07-18T03:01:40.476Z",
            "updatedAt": "2026-07-18T03:01:40.476Z",
            "place": null,
            "transportSegment": {
              "itemId": "cmrps62uz000byon3exuffv1a",
              "mode": "train",
              "fromPlaceId": null,
              "toPlaceId": null,
              "fromStation": null,
              "toStation": null,
              "departureTime": null,
              "arrivalTime": null,
              "durationSeconds": 6300,
              "distanceMeters": null,
              "costMinor": 12000,
              "carrierName": null,
              "carrierCode": null,
              "providerCode": null,
              "routeObservedAt": null
            }
          },
          {
            "id": "cmrps62vp000fyon3x4fpifdj",
            "tripDayId": "cmrps62ud0005yon3zpn3shlb",
            "kind": "hotel",
            "title": "入住 杭州商务酒店",
            "subtitle": "住宿",
            "position": 1,
            "startAt": "2026-08-10T18:00:00.000Z",
            "endAt": null,
            "placeId": null,
            "locationText": "杭州",
            "costMinor": 35000,
            "locked": false,
            "isFixed": false,
            "note": null,
            "icon": "bi-building",
            "status": "estimated",
            "sourceType": "system",
            "version": 1,
            "createdAt": "2026-07-18T03:01:40.501Z",
            "updatedAt": "2026-07-18T03:01:40.501Z",
            "place": null,
            "transportSegment": null
          }
        ]
      },
      {
        "id": "cmrps62ui0007yon3avmim9je",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "localDate": "2026-08-11T00:00:00.000Z",
        "dayType": "meeting_day",
        "budgetMinor": 0,
        "totalCostMinor": 0,
        "startPlaceId": null,
        "endPlaceId": null,
        "weatherSummary": null,
        "items": [
          {
            "id": "cmrps62vv000hyon3dwjdvgls",
            "tripDayId": "cmrps62ui0007yon3avmim9je",
            "kind": "hotel",
            "title": "入住 杭州商务酒店",
            "subtitle": "住宿",
            "position": 0,
            "startAt": "2026-08-11T18:00:00.000Z",
            "endAt": null,
            "placeId": null,
            "locationText": "杭州",
            "costMinor": 35000,
            "locked": false,
            "isFixed": false,
            "note": null,
            "icon": "bi-building",
            "status": "estimated",
            "sourceType": "system",
            "version": 1,
            "createdAt": "2026-07-18T03:01:40.507Z",
            "updatedAt": "2026-07-18T03:01:40.507Z",
            "place": null,
            "transportSegment": null
          }
        ]
      },
      {
        "id": "cmrps62um0009yon3lgu1684w",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "localDate": "2026-08-12T00:00:00.000Z",
        "dayType": "return",
        "budgetMinor": 0,
        "totalCostMinor": 0,
        "startPlaceId": null,
        "endPlaceId": null,
        "weatherSummary": null,
        "items": [
          {
            "id": "cmrps62vd000dyon331dgqsto",
            "tripDayId": "cmrps62um0009yon3lgu1684w",
            "kind": "transport",
            "title": "杭州 → 上海",
            "subtitle": "G7318",
            "position": 0,
            "startAt": "2026-08-12T14:00:00.000Z",
            "endAt": "2026-08-12T15:45:00.000Z",
            "placeId": null,
            "locationText": "杭州站 → 上海站",
            "costMinor": 12000,
            "locked": false,
            "isFixed": false,
            "note": null,
            "icon": "bi-train-front",
            "status": "estimated",
            "sourceType": "system",
            "version": 1,
            "createdAt": "2026-07-18T03:01:40.489Z",
            "updatedAt": "2026-07-18T03:01:40.489Z",
            "place": null,
            "transportSegment": {
              "itemId": "cmrps62vd000dyon331dgqsto",
              "mode": "train",
              "fromPlaceId": null,
              "toPlaceId": null,
              "fromStation": null,
              "toStation": null,
              "departureTime": null,
              "arrivalTime": null,
              "durationSeconds": 6300,
              "distanceMeters": null,
              "costMinor": 12000,
              "carrierName": null,
              "carrierCode": null,
              "providerCode": null,
              "routeObservedAt": null
            }
          }
        ]
      }
    ],
    "quoteSearches": [],
    "planVersions": [
      {
        "id": "cmrps62w0000jyon3iu0iuqzg",
        "tripId": "cmrps5fmh0002yon3s8bg02ny",
        "version": 2,
        "strategy": "balanced",
        "status": "applied",
        "summary": "自动生成行程：3天，2交通 + 2酒店 + 0活动",
        "evidence": {
          "dayTypes": [
            { "date": "2026-08-10T00:00:00.000Z", "type": "departure" },
            { "date": "2026-08-11T00:00:00.000Z", "type": "meeting_day" },
            { "date": "2026-08-12T00:00:00.000Z", "type": "return" }
          ],
          "strategy": "balanced"
        },
        "createdAt": "2026-07-18T03:01:40.512Z"
      }
    ],
    "costSummary": {
      "transportMinor": 24000,
      "hotelMinor": 70000,
      "mealMinor": 0,
      "commuteMinor": 0,
      "attractionMinor": 0,
      "totalMinor": 94000,
      "budgetMinor": 200000,
      "remainingMinor": 106000,
      "status": "within_budget"
    }
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

**costSummary 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `transportMinor` | number | 交通总费用（分） |
| `hotelMinor` | number | 酒店总费用（分） |
| `mealMinor` | number | 餐饮总费用（分） |
| `commuteMinor` | number | 市内交通总费用（分） |
| `attractionMinor` | number | 门票总费用（分） |
| `totalMinor` | number | 预计总费用（分） |
| `budgetMinor` | number | 预算（分） |
| `remainingMinor` | number | 剩余预算（分） |
| `status` | string | `within_budget` / `close_to_budget` / `slightly_over` / `over_budget` |

---

### 3.4 更新旅行信息

**`PATCH /trips/:tripId`**

**路径参数：** `tripId`

**请求体（全部可选）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题 |
| `budgetMinor` | number | 预算（分） |
| `transportPreference` | string | 交通偏好 |
| `hotelMaxPriceMinor` | number | 酒店最高价/晚（分） |
| `wantsSightseeing` | boolean | 是否安排游玩 |
| `attractionPreference` | string | 景点偏好 |
| `pace` | string | 行程节奏 |
| `version` | number | 乐观锁版本号（传入当前版本号，不匹配返回 409） |

**请求示例：**

```json
{
  "budgetMinor": 300000,
  "pace": "intense",
  "version": 2
}
```

**响应：** 同 [3.3 获取行程详情](#33-获取行程详情)（更新后的完整数据）

---

### 3.5 删除行程

**`DELETE /trips/:tripId`**

**路径参数：** `tripId`

**响应示例：**

```json
{
  "data": { "success": true },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 4. 行程编辑模块

> 🔒 以下接口均需要认证

### 4.1 获取所有天及活动项

**`GET /trips/:tripId/days`**

**响应示例：**

```json
{
  "data": [
    {
      "id": "cmrps62ud0005yon3zpn3shlb",
      "tripId": "cmrps5fmh0002yon3s8bg02ny",
      "localDate": "2026-08-10T00:00:00.000Z",
      "dayType": "departure",
      "budgetMinor": 0,
      "totalCostMinor": 47000,
      "startPlaceId": null,
      "endPlaceId": null,
      "weatherSummary": null,
      "items": [
        {
          "id": "cmrps62uz000byon3exuffv1a",
          "tripDayId": "cmrps62ud0005yon3zpn3shlb",
          "kind": "transport",
          "title": "上海 → 杭州",
          "subtitle": "G7311",
          "position": 0,
          "startAt": "2026-08-10T14:30:00.000Z",
          "endAt": "2026-08-10T16:15:00.000Z",
          "placeId": null,
          "locationText": "上海站 → 杭州站",
          "costMinor": 12000,
          "locked": false,
          "isFixed": false,
          "note": null,
          "icon": "bi-train-front",
          "status": "estimated",
          "sourceType": "system",
          "version": 1,
          "createdAt": "2026-07-18T03:01:40.476Z",
          "updatedAt": "2026-07-18T03:01:40.476Z",
          "place": null,
          "transportSegment": {
            "itemId": "cmrps62uz000byon3exuffv1a",
            "mode": "train",
            "durationSeconds": 6300,
            "costMinor": 12000
          }
        }
      ]
    }
  ],
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

**dayType 枚举值：**

| 值 | 说明 |
|---|------|
| `departure` | 出发日 |
| `meeting_day` | 会议日 |
| `return` | 返程日 |
| `free` | 自由日 |

**kind 枚举值（活动项类型）：**

| 值 | 说明 |
|---|------|
| `transport` | 城际交通（火车/飞机） |
| `commute` | 市内交通 |
| `hotel` | 住宿 |
| `meal` | 餐饮 |
| `attraction` | 景点 |
| `meeting` | 会议 |
| `fixed` | 固定事项 |
| `free_time` | 空闲时间 |

---

### 4.2 新增活动项

**`POST /trips/:tripId/items`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `dayId` | string | ✅ | 所属天 ID |
| `kind` | string | ✅ | 类型，见上方枚举 |
| `title` | string | ✅ | 标题 |
| `subtitle` | string | ❌ | 副标题 |
| `position` | number | ❌ | 排序位置（不传则追加到末尾） |
| `startAt` | string | ❌ | 开始时间 ISO 8601 |
| `endAt` | string | ❌ | 结束时间 ISO 8601 |
| `placeId` | string | ❌ | 关联地点 ID |
| `locationText` | string | ❌ | 地点文字描述 |
| `costMinor` | number | ❌ | 费用（分），默认 `0` |
| `note` | string | ❌ | 备注 |
| `icon` | string | ❌ | Bootstrap Icon 类名 |
| `isFixed` | boolean | ❌ | 是否固定项 |

**请求示例：**

```json
{
  "dayId": "cmrps62ud0005yon3zpn3shlb",
  "kind": "attraction",
  "title": "西湖风景区",
  "subtitle": "自然风光",
  "startAt": "2026-08-11T14:00:00+08:00",
  "endAt": "2026-08-11T17:00:00+08:00",
  "placeId": "place_xihu",
  "locationText": "杭州市西湖区龙井路1号",
  "costMinor": 0,
  "icon": "bi-tree"
}
```

**响应：** 返回创建的活动项完整对象

---

### 4.3 修改活动项

**`PATCH /trips/:tripId/items/:itemId`**

**请求体（全部可选）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题 |
| `subtitle` | string | 副标题 |
| `startAt` | string | 开始时间 |
| `endAt` | string | 结束时间 |
| `placeId` | string | 关联地点 |
| `locationText` | string | 地点描述 |
| `costMinor` | number | 费用（分） |
| `note` | string | 备注 |
| `version` | number | 乐观锁版本号 |

> ⚠️ 已锁定（`locked: true`）的项目不可修改

**请求示例：**

```json
{
  "note": "已确认",
  "costMinor": 15000,
  "version": 1
}
```

**响应：** 返回更新后的活动项完整对象

---

### 4.4 删除活动项

**`DELETE /trips/:tripId/items/:itemId`**

> ⚠️ 固定项（`isFixed: true`）和锁定项（`locked: true`）不能删除

**响应示例：**

```json
{
  "data": { "success": true },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 4.5 移动活动项（拖拽）

**`POST /trips/:tripId/items/:itemId/move`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `toDayId` | string | ✅ | 目标天 ID |
| `beforeItemId` | string | ❌ | 插入到此项之前 |
| `position` | number | ❌ | 指定位置 |
| `baseVersion` | number | ✅ | 当前版本号（乐观锁） |

**请求示例：**

```json
{
  "toDayId": "cmrps62ui0007yon3avmim9je",
  "beforeItemId": "cmrps62vv000hyon3dwjdvgls",
  "baseVersion": 2
}
```

**响应示例：**

```json
{
  "data": { "success": true, "version": 3 },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 4.6 锁定/解锁活动项

**`POST /trips/:tripId/items/:itemId/lock`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `locked` | boolean | ✅ | `true` 锁定，`false` 解锁 |

**请求示例：**

```json
{ "locked": true }
```

**响应：** 返回更新后的活动项完整对象

---

### 4.7 批量排序

**`POST /trips/:tripId/items/reorder`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `items` | array | ✅ | `[{id, position}]` |
| `baseVersion` | number | ✅ | 当前版本号 |

**请求示例：**

```json
{
  "items": [
    { "id": "cmrps62uz000byon3exuffv1a", "position": 0 },
    { "id": "cmrps62vp000fyon3x4fpifdj", "position": 1 }
  ],
  "baseVersion": 3
}
```

**响应示例：**

```json
{
  "data": { "success": true, "version": 4 },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 5. 自动规划模块

> 🔒 以下接口均需要认证

### 5.1 触发自动规划

**`POST /trips/:tripId/planning/plan`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `strategy` | string | ❌ | 策略：`"budget"` / `"balanced"` / `"comfort"`，默认 `"balanced"` |
| `useTravelProfile` | boolean | ❌ | 是否使用旅行画像，默认 `false` |
| `lockedItemIds` | string[] | ❌ | 锁定的活动项 ID 列表 |

**请求示例：**

```json
{
  "strategy": "balanced"
}
```

**响应示例：**

```json
{
  "data": {
    "jobId": "plan_cmrps5fmh0002yon3s8bg02ny_1784343700000",
    "status": "completed",
    "planVersion": {
      "id": "cmrps62w0000jyon3iu0iuqzg",
      "tripId": "cmrps5fmh0002yon3s8bg02ny",
      "version": 2,
      "strategy": "balanced",
      "status": "applied",
      "summary": "自动生成行程：3天，2交通 + 2酒店 + 0活动",
      "evidence": {
        "dayTypes": [
          { "date": "2026-08-10T00:00:00.000Z", "type": "departure" },
          { "date": "2026-08-11T00:00:00.000Z", "type": "meeting_day" },
          { "date": "2026-08-12T00:00:00.000Z", "type": "return" }
        ],
        "strategy": "balanced"
      },
      "createdAt": "2026-07-18T03:01:40.512Z"
    },
    "stats": {
      "days": 3,
      "transport": 2,
      "hotels": 2,
      "activities": 0
    }
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 5.2 查询规划状态

**`GET /trips/:tripId/planning/status`**

**响应示例：**

```json
{
  "data": {
    "status": "ready",
    "version": 2
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

**status 枚举：** `draft` / `planning` / `ready` / `confirmed` / `archived`

---

### 5.3 获取规划结果

**`GET /trips/:tripId/planning/result`**

**响应：** 同 [3.3 获取行程详情](#33-获取行程详情)

---

### 5.4 应用规划版本

**`POST /trips/:tripId/planning/apply`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | number | ✅ | 要应用的版本号 |

**请求示例：**

```json
{ "version": 2 }
```

**响应示例：**

```json
{
  "data": { "success": true, "version": 2 },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 6. 报价比价模块

> 🔒 以下接口均需要认证

### 6.1 搜索报价

**`POST /trips/:tripId/quotes/search`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productType` | string | ✅ | `"flight"` / `"train"` / `"hotel"` / `"ticket"` |
| `criteria` | object | ✅ | 搜索条件（自由 JSON） |
| `providerCodes` | string[] | ❌ | 指定供应商，不传则查全部 |

**请求示例：**

```json
{
  "productType": "train",
  "criteria": { "from": "上海", "to": "杭州" }
}
```

**响应示例：**

```json
{
  "data": {
    "searchId": "cmrpsfvij0001d6ihaq2qn59z",
    "status": "completed",
    "quotes": [
      {
        "id": "cmrpsfvit0003d6ihhixpjl4s",
        "quoteSearchId": "cmrpsfvij0001d6ihaq2qn59z",
        "providerCode": "mock-ctrip",
        "productType": "train",
        "productName": "G7311 高铁二等座",
        "comparableKey": "train_G7311_2nd",
        "basePriceMinor": 12000,
        "taxesFeesMinor": 0,
        "totalPriceMinor": 12000,
        "currency": "CNY",
        "priceUnit": "total",
        "conditions": {
          "seatClass": "二等座",
          "refundable": true
        },
        "inventoryStatus": "available",
        "deepLink": "https://mock.ctrip.com/train/G7311",
        "observedAt": "2026-07-18T03:09:17.524Z",
        "expiresAt": "2026-07-18T03:19:17.524Z"
      },
      {
        "id": "cmrpsfviz0005d6ihiz7rxykz",
        "quoteSearchId": "cmrpsfvij0001d6ihaq2qn59z",
        "providerCode": "mock-qunar",
        "productType": "train",
        "productName": "G7311 高铁二等座",
        "comparableKey": "train_G7311_2nd",
        "basePriceMinor": 11800,
        "taxesFeesMinor": 0,
        "totalPriceMinor": 11800,
        "currency": "CNY",
        "priceUnit": "total",
        "conditions": { "seatClass": "二等座", "refundable": true },
        "inventoryStatus": "available",
        "deepLink": "https://mock.qunar.com/train/G7311",
        "observedAt": "2026-07-18T03:09:17.530Z",
        "expiresAt": "2026-07-18T03:19:17.530Z"
      },
      {
        "id": "cmrpsfvj40007d6ih871sq3cg",
        "quoteSearchId": "cmrpsfvij0001d6ihaq2qn59z",
        "providerCode": "mock-ctrip",
        "productType": "train",
        "productName": "G7311 高铁一等座",
        "comparableKey": "train_G7311_1st",
        "basePriceMinor": 20000,
        "taxesFeesMinor": 0,
        "totalPriceMinor": 20000,
        "currency": "CNY",
        "priceUnit": "total",
        "conditions": { "seatClass": "一等座", "refundable": true },
        "inventoryStatus": "available",
        "deepLink": "https://mock.ctrip.com/train/G7311-1st",
        "observedAt": "2026-07-18T03:09:17.535Z",
        "expiresAt": "2026-07-18T03:19:17.535Z"
      }
    ],
    "cached": true
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

**quote 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `providerCode` | string | 供应商代码（如 `mock-ctrip`） |
| `comparableKey` | string | 可比商品标识（同 key 可比较） |
| `basePriceMinor` | number | 基础价（分） |
| `taxesFeesMinor` | number | 税费（分） |
| `totalPriceMinor` | number | 总价（分） |
| `priceUnit` | string | `total` / `person` / `room-night` |
| `conditions` | object | 退改条件、包含项等 |
| `inventoryStatus` | string | `available` / `limited` / `sold_out` / `unknown` |
| `deepLink` | string | 预订跳转链接 |
| `observedAt` | string | 报价抓取时间 |
| `expiresAt` | string | 报价过期时间 |

---

### 6.2 获取行程相关报价

**`GET /trips/:tripId/quotes`**

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productType` | string | ❌ | 筛选品类 |

**响应示例：**

```json
{
  "data": [
    {
      "id": "cmrpsfvit0003d6ihhixpjl4s",
      "quoteSearchId": "cmrpsfvij0001d6ihaq2qn59z",
      "providerCode": "mock-ctrip",
      "productType": "train",
      "productName": "G7311 高铁二等座",
      "comparableKey": "train_G7311_2nd",
      "basePriceMinor": 12000,
      "taxesFeesMinor": 0,
      "totalPriceMinor": 12000,
      "currency": "CNY",
      "priceUnit": "total",
      "conditions": { "seatClass": "二等座", "refundable": true },
      "inventoryStatus": "available",
      "deepLink": "https://mock.ctrip.com/train/G7311",
      "observedAt": "2026-07-18T03:09:17.524Z",
      "expiresAt": "2026-07-18T03:19:17.524Z",
      "isExpired": false
    }
  ],
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 6.3 刷新报价

**`POST /quotes/:quoteId/refresh`**

**路径参数：** `quoteId`

**响应示例：**（返回新的报价快照）

```json
{
  "data": {
    "id": "cmrpsg000000newquote00001",
    "quoteSearchId": "cmrpsfvij0001d6ihaq2qn59z",
    "providerCode": "mock-ctrip",
    "productType": "train",
    "productName": "G7311 高铁二等座",
    "comparableKey": "train_G7311_2nd",
    "basePriceMinor": 11500,
    "taxesFeesMinor": 0,
    "totalPriceMinor": 11500,
    "currency": "CNY",
    "priceUnit": "total",
    "conditions": { "seatClass": "二等座", "refundable": true },
    "inventoryStatus": "available",
    "deepLink": "https://mock.ctrip.com/train/G7311",
    "observedAt": "2026-07-18T03:20:00.000Z",
    "expiresAt": "2026-07-18T03:30:00.000Z"
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 6.4 生成深链并记录跳转

**`POST /quotes/:quoteId/clickout`**

**路径参数：** `quoteId`

**响应示例：**

```json
{
  "data": {
    "deepLink": "https://mock.ctrip.com/train/G7311",
    "providerCode": "mock-ctrip",
    "totalPriceMinor": 12000,
    "expiresAt": "2026-07-18T03:19:17.524Z"
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 7. 攻略内容模块

> 🔒 以下接口均需要认证

### 7.1 导入文本攻略

**`POST /content/imports/text`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rawText` | string | ✅ | 攻略文本内容 |
| `title` | string | ❌ | 标题 |
| `tripId` | string | ❌ | 关联旅行 ID |

**请求示例：**

```json
{
  "rawText": "杭州旅行攻略：推荐去西湖游玩，风景很好。午餐可以去楼外楼吃杭帮菜。灵隐寺也值得一去，早上去比较好。",
  "title": "杭州攻略",
  "tripId": "cmrps5fmh0002yon3s8bg02ny"
}
```

**响应示例：**

```json
{
  "data": {
    "id": "cmrpsg1000000source00001",
    "status": "completed",
    "extractedCount": 3,
    "places": [
      {
        "mention": "西湖",
        "suggestedDurationMinutes": 180,
        "suggestedPeriod": "afternoon",
        "sentiment": "positive",
        "confidence": 0.85,
        "tips": [],
        "evidence": "推荐去西湖游玩，风景很好"
      },
      {
        "mention": "楼外楼",
        "suggestedDurationMinutes": 90,
        "suggestedPeriod": "afternoon",
        "sentiment": "positive",
        "confidence": 0.78,
        "tips": [],
        "evidence": "午餐可以去楼外楼吃杭帮菜"
      },
      {
        "mention": "灵隐寺",
        "suggestedDurationMinutes": 120,
        "suggestedPeriod": "morning",
        "sentiment": "positive",
        "confidence": 0.82,
        "tips": ["建议上午前往"],
        "evidence": "灵隐寺也值得一去，早上去比较好"
      }
    ]
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 7.2 导入链接

**`POST /content/imports/link`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sourceUrl` | string | ✅ | 链接地址 |
| `title` | string | ❌ | 标题 |
| `tripId` | string | ❌ | 关联旅行 ID |

**请求示例：**

```json
{
  "sourceUrl": "https://www.xiaohongshu.com/explore/abc123",
  "title": "杭州三日游攻略",
  "tripId": "cmrps5fmh0002yon3s8bg02ny"
}
```

**响应示例：**

```json
{
  "data": {
    "id": "cmrpsg2000000source00001",
    "status": "metadata_only",
    "message": "链接已保存。由于平台限制，无法直接读取正文。请粘贴文本内容。"
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 7.3 获取攻略抽取结果

**`GET /content/sources/:sourceId`**

**响应示例：**

```json
{
  "data": {
    "id": "cmrpsg1000000source00001",
    "tripId": "cmrps5fmh0002yon3s8bg02ny",
    "userId": "cmrps5f8h0000yon3baj2cy1j",
    "sourceType": "text",
    "sourceUrl": null,
    "title": "杭州攻略",
    "authorDisplay": null,
    "rawText": "杭州旅行攻略：推荐去西湖游玩...",
    "summary": "杭州旅行攻略：推荐去西湖游玩，风景很好。午餐可以去楼外楼...",
    "extractedPlaces": [...],
    "status": "completed",
    "errorMessage": null,
    "importedAt": "2026-07-18T03:15:00.000Z",
    "updatedAt": "2026-07-18T03:15:00.000Z",
    "mentions": [
      {
        "id": "cmrpsg1000000mention001",
        "contentSourceId": "cmrpsg1000000source00001",
        "placeId": "place_xihu",
        "mentionText": "西湖",
        "evidenceSpan": "推荐去西湖游玩，风景很好",
        "suggestedDurationMin": 180,
        "suggestedPeriod": "afternoon",
        "tips": [],
        "sentiment": "positive",
        "confidence": 0.85,
        "resolutionStatus": "confirmed",
        "resolvedAt": "2026-07-18T03:15:00.000Z",
        "place": {
          "id": "place_xihu",
          "canonicalName": "西湖风景区",
          "category": "attraction",
          "cityCode": "hangzhou",
          "cityName": "杭州",
          "address": "杭州市西湖区龙井路1号",
          "lat": 30.2421,
          "lng": 120.1483
        }
      }
    ]
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 7.4 获取行程关联攻略

**`GET /content/trips/:tripId/sources`**

**响应示例：**

```json
{
  "data": [
    {
      "id": "cmrpsg1000000source00001",
      "tripId": "cmrps5fmh0002yon3s8bg02ny",
      "userId": "cmrps5f8h0000yon3baj2cy1j",
      "sourceType": "text",
      "sourceUrl": null,
      "title": "杭州攻略",
      "authorDisplay": null,
      "rawText": "杭州旅行攻略...",
      "summary": "杭州旅行攻略...",
      "extractedPlaces": [...],
      "status": "completed",
      "errorMessage": null,
      "importedAt": "2026-07-18T03:15:00.000Z",
      "updatedAt": "2026-07-18T03:15:00.000Z",
      "_count": { "mentions": 3 }
    }
  ],
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 7.5 删除攻略

**`DELETE /content/sources/:sourceId`**

**响应示例：**

```json
{
  "data": { "success": true },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 7.6 确认地点映射

**`POST /content/mentions/:mentionId/resolve`**

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `placeId` | string | ✅ | 确认映射到的地点 ID |

**请求示例：**

```json
{ "placeId": "place_xihu" }
```

**响应示例：**

```json
{
  "data": { "success": true },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 8. 地点模块

### 8.1 搜索地点

**`GET /places/search`** — 无需认证

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `city` | string | ❌ | 城市名或代码，如 `"杭州"` 或 `"hangzhou"` |
| `q` | string | ❌ | 关键词搜索 |
| `category` | string | ❌ | `"attraction"` / `"restaurant"` / `"hotel"` / `"station"` / `"shopping"` |
| `limit` | number | ❌ | 返回数量，默认 `20` |

**请求示例：**

```
GET /places/search?city=杭州&category=attraction
```

**响应示例：**

```json
{
  "data": [
    {
      "id": "place_xihu",
      "canonicalName": "西湖风景区",
      "category": "attraction",
      "cityCode": "hangzhou",
      "cityName": "杭州",
      "address": "杭州市西湖区龙井路1号",
      "lat": 30.2421,
      "lng": 120.1483,
      "timezone": "Asia/Shanghai",
      "attributes": {
        "rating": 4.8,
        "description": "杭州最著名的自然风景区，世界文化遗产",
        "openHours": "全天开放",
        "ticketPrice": 0
      },
      "createdAt": "2026-07-18T02:39:30.713Z",
      "updatedAt": "2026-07-18T02:39:30.713Z"
    },
    {
      "id": "place_lingyin",
      "canonicalName": "灵隐寺",
      "category": "attraction",
      "cityCode": "hangzhou",
      "cityName": "杭州",
      "address": "杭州市西湖区灵隐路法云弄1号",
      "lat": 30.24,
      "lng": 120.101,
      "timezone": "Asia/Shanghai",
      "attributes": {
        "rating": 4.6,
        "description": "千年古刹，江南名刹",
        "openHours": "07:00-18:15",
        "ticketPrice": 7500
      },
      "createdAt": "2026-07-18T02:39:30.713Z",
      "updatedAt": "2026-07-18T02:39:30.713Z"
    },
    {
      "id": "place_songcheng",
      "canonicalName": "宋城景区",
      "category": "attraction",
      "cityCode": "hangzhou",
      "cityName": "杭州",
      "address": "杭州市西湖区之江路148号",
      "lat": 30.185,
      "lng": 120.113,
      "timezone": "Asia/Shanghai",
      "attributes": {
        "rating": 4.5,
        "description": "大型宋文化主题公园",
        "openHours": "10:00-21:00",
        "ticketPrice": 31000
      },
      "createdAt": "2026-07-18T02:39:30.713Z",
      "updatedAt": "2026-07-18T02:39:30.713Z"
    },
    {
      "id": "place_xixi",
      "canonicalName": "西溪湿地公园",
      "category": "attraction",
      "cityCode": "hangzhou",
      "cityName": "杭州",
      "address": "杭州市西湖区天目山路518号",
      "lat": 30.266,
      "lng": 120.061,
      "timezone": "Asia/Shanghai",
      "attributes": {
        "rating": 4.4,
        "description": "国家级湿地公园",
        "openHours": "08:00-17:30",
        "ticketPrice": 8000
      },
      "createdAt": "2026-07-18T02:39:30.713Z",
      "updatedAt": "2026-07-18T02:39:30.713Z"
    }
  ],
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 8.2 获取城市列表

**`GET /places/cities`** — 无需认证

**响应示例：**

```json
{
  "data": [
    {
      "id": "city_beijing",
      "code": "beijing",
      "name": "北京",
      "province": "北京市",
      "lat": 39.9042,
      "lng": 116.4074,
      "timezone": "Asia/Shanghai",
      "isActive": true
    },
    {
      "id": "city_shanghai",
      "code": "shanghai",
      "name": "上海",
      "province": "上海市",
      "lat": 31.2304,
      "lng": 121.4737,
      "timezone": "Asia/Shanghai",
      "isActive": true
    },
    {
      "id": "city_hangzhou",
      "code": "hangzhou",
      "name": "杭州",
      "province": "浙江省",
      "lat": 30.2741,
      "lng": 120.1551,
      "timezone": "Asia/Shanghai",
      "isActive": true
    }
  ],
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

### 8.3 地点详情

**`GET /places/:placeId`** — 无需认证

**响应示例：**

```json
{
  "data": {
    "id": "place_xihu",
    "canonicalName": "西湖风景区",
    "category": "attraction",
    "cityCode": "hangzhou",
    "cityName": "杭州",
    "address": "杭州市西湖区龙井路1号",
    "lat": 30.2421,
    "lng": 120.1483,
    "timezone": "Asia/Shanghai",
    "attributes": {
      "rating": 4.8,
      "description": "杭州最著名的自然风景区，世界文化遗产",
      "openHours": "全天开放",
      "ticketPrice": 0
    },
    "createdAt": "2026-07-18T02:39:30.713Z",
    "updatedAt": "2026-07-18T02:39:30.713Z",
    "mentions": [
      {
        "id": "cmrpsg1000000mention001",
        "contentSourceId": "cmrpsg1000000source00001",
        "mentionText": "西湖",
        "confidence": 0.85,
        "contentSource": {
          "id": "cmrpsg1000000source00001",
          "title": "杭州攻略",
          "sourceType": "text"
        }
      }
    ]
  },
  "meta": { "requestId": "req_xxx", "timestamp": "..." }
}
```

---

## 9. 错误码

| HTTP | 错误码 | 场景 |
|------|--------|------|
| 400 | `INVALID_INPUT` | 请求参数校验失败 |
| 400 | `INVALID_TRIP_WINDOW` | 出发日期晚于返回日期 |
| 401 | `INVALID_CREDENTIALS` | 用户名或密码错误 |
| 401 | `UNAUTHORIZED` | 未提供 Token 或 Token 无效 |
| 404 | `TRIP_NOT_FOUND` | 行程不存在 |
| 404 | `ITEM_NOT_FOUND` | 活动项不存在 |
| 404 | `QUOTE_NOT_FOUND` | 报价不存在 |
| 404 | `CONTENT_NOT_FOUND` | 攻略不存在 |
| 404 | `PLACE_NOT_FOUND` | 地点不存在 |
| 404 | `PLAN_NOT_FOUND` | 规划版本不存在 |
| 404 | `NOT_FOUND` | 用户不存在 |
| 409 | `USER_ALREADY_EXISTS` | 用户名或邮箱已存在 |
| 409 | `TRIP_VERSION_CONFLICT` | 乐观锁版本冲突 |
| 409 | `ITINERARY_TIME_CONFLICT` | 时间冲突（锁定/固定项不可操作） |
| 422 | `PLAN_INFEASIBLE` | 约束组合不存在可行方案 |
| 429 | `PROVIDER_RATE_LIMITED` | 外部供应商限流 |
| 503 | `PROVIDER_UNAVAILABLE` | 外部供应商不可用 |

---

> **文档版本：** V1.0
> **最后更新：** 2026-07-18
> **对应代码分支：** `backend` (NestJS)
