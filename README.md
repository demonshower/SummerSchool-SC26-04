# SummerSchool-SC26-04

出差行程规划助手，采用前后端分离结构：

- `backend/`：NestJS + Prisma 后端 API，来自 `v1backend`
- `frontend/`：Next.js 前端，来自 `v1frontend`

## 启动后端

```bash
cd backend
cp .env.example .env
npx pnpm@9 install --frozen-lockfile
npx pnpm@9 prisma:generate
npx pnpm@9 start:dev
```

后端默认地址为 `http://localhost:8080`，API 前缀为
`http://localhost:8080/api/v1`。数据库初始化和部署说明见
[`backend/doc/deployment.md`](backend/doc/deployment.md)。

## 启动前端

```bash
cd frontend
npm ci
printf 'NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1\n' > .env.local
npm run dev
```

浏览器访问 `http://localhost:3000`。更多说明见
[`frontend/README.md`](frontend/README.md)。

## 构建验证

```bash
(cd backend && npx pnpm@9 build)
(cd frontend && npm run build)
```
