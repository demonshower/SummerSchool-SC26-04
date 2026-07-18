/**
 * 外部服务配置 — 仅从环境变量读取
 */
export const providerConfig = {
  llm: {
    enabled: process.env.ENABLE_LLM !== 'false',
    baseUrl: (process.env.LLM_BASE_URL || 'https://chat.ecnu.edu.cn/open/api/v1').replace(/\/$/, ''),
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'ecnu-plus',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 60000),
  },
  amap: {
    enabled: process.env.ENABLE_AMAP !== 'false',
    webServiceKey: process.env.AMAP_WEB_SERVICE_KEY || '',
    securityKey: process.env.AMAP_SECURITY_KEY || '',
    baseUrl: 'https://restapi.amap.com',
  },
  weather: {
    provider: process.env.WEATHER_PROVIDER || 'amap',
    enabled: process.env.ENABLE_LIVE_WEATHER !== 'false',
    qweatherKey: process.env.QWEATHER_API_KEY || '',
    qweatherHost: process.env.QWEATHER_API_HOST || '',
  },
  bocha: {
    enabled: process.env.ENABLE_WEB_RESEARCH !== 'false',
    baseUrl: (process.env.BOCHA_API_BASE_URL || 'https://api.bochaai.com/v1').replace(
      /\/$/,
      '',
    ),
    apiKey: process.env.BOCHA_API_KEY || '',
    timeoutMs: Number(process.env.BOCHA_TIMEOUT_MS || 30000),
  },
};
