# 外部服务 Provider 接入说明（V2 第一阶段）

> 密钥只放 `backend/.env`，不要提交 Git。

## 已落地模块

| Provider | 代码路径 | 能力 | 业务接入点 |
|----------|----------|------|------------|
| **ECNU LLM** | `src/modules/providers/llm/llm.provider.ts` | chat / 攻略抽取 / 需求解析 / 方案解释 | `content` 文本导入、`planning` 方案解释、`POST /providers/ai/*` |
| **高德 Web 服务** | `src/modules/providers/amap/amap.provider.ts` | 地理编码 / POI / 驾车步行公交 / 天气 | `places` 搜索、`content` 地点消歧、`planning` 酒店景点与通勤 |
| **天气** | `src/modules/providers/weather/weather.provider.ts` | 实时 + 预报（当前走高德） | `planning` 写入 `trip_days.weatherSummary` |
| **博查搜索** | `src/modules/providers/search/bocha.provider.ts` | 中文网页攻略搜索 | `research` 模块、调试 `POST /providers/search/web` |

## 配置项（.env）

```env
LLM_PROVIDER=ecnu
LLM_BASE_URL=https://chat.ecnu.edu.cn/open/api/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=ecnu-plus

MAP_PROVIDER=amap
AMAP_WEB_SERVICE_KEY=你的Web服务Key
AMAP_SECURITY_KEY=安全密钥（可选，视控制台配置）

WEATHER_PROVIDER=amap
ENABLE_LLM=true
ENABLE_AMAP=true
ENABLE_LIVE_WEATHER=true
```

## 调试接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/providers/health` | 配置是否启用（不含密钥） |
| GET | `/api/v1/providers/weather?city=杭州` | 天气 |
| GET | `/api/v1/providers/geocode?address=西湖&city=杭州` | 地理编码 |
| GET | `/api/v1/providers/poi?q=西湖&city=杭州` | POI |
| GET | `/api/v1/providers/route?origin=lng,lat&destination=lng,lat&city=杭州` | 路径 |
| POST | `/api/v1/providers/ai/parse-request` | 自然语言需求解析 |
| POST | `/api/v1/providers/ai/extract-places` | 攻略地点抽取 |
| POST | `/api/v1/providers/ai/chat` | 原始对话调试 |
| POST | `/api/v1/providers/search/web` | 博查网页搜索（调试） |
| POST | `/api/v1/research/web-search` | 博查搜索（需登录） |
| POST | `/api/v1/trips/:tripId/research` | 行程攻略研究（多查询+抽取+持久化） |
| GET | `/api/v1/trips/:tripId/research/sources` | 行程研究来源列表 |
| GET | `/api/v1/trips/:tripId/research/insights` | 行程攻略聚合洞察 |

## 高德 Key 重要说明

若接口返回：

```text
USERKEY_PLAT_NOMATCH / infocode=10009
```

表示当前 Key **不是「Web 服务」类型**（可能是 JS API / Android / iOS Key）。

**处理步骤：**

1. 打开 [高德开放平台控制台](https://console.amap.com/dev/key/app)
2. 创建应用时服务平台选择 **「Web服务」**
3. 生成新的 Key，写入 `AMAP_WEB_SERVICE_KEY`
4. `docker compose up -d api` 或重启本地进程

安全密钥（jscode）主要用于前端 JS API；**后端 REST 调用通常只需要 Web 服务 Key**。

## 业务行为变化

### 攻略导入 `POST /content/imports/text`

1. 若 LLM 可用 → 用 ECNU 模型结构化抽取  
2. 失败则回退本地关键词表  
3. 若高德可用 → 用 POI 搜索辅助消歧并缓存到 `places`  

响应新增：`extractMethod: "llm" | "keyword"`

### 地点搜索 `GET /places/search`

返回：

```json
{
  "local": [/* 数据库 */],
  "live": [/* 高德实时，id 形如 amap_xxx */],
  "total": 0
}
```

### 自动规划 `POST /trips/:id/planning/plan`

- 天气写入每天 `weatherSummary`（高德可用时）  
- 酒店/景点优先高德 POI，否则本地种子  
- 相邻有坐标活动计算通勤 `routeHints`  
- LLM 生成 `explanation`（优点/缺点/风险）  
- `planVersion.evidence.dataSources` 标明数据来源  

城际火车/机票仍为 **估算/Mock**（个人无 12306/企业 OTA 权限）。

## 验证示例

```bash
# 健康检查
curl http://localhost:8080/api/v1/providers/health

# LLM 抽取（注意 UTF-8）
curl -X POST http://localhost:8080/api/v1/providers/ai/extract-places \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"text\":\"杭州西湖和灵隐寺值得去\",\"city\":\"杭州\"}"
```

## 重启

```bash
cd backend
docker compose up --build -d api
```
