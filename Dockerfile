FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
RUN npx prisma generate && npx nest build
EXPOSE 8080
CMD ["node", "dist/src/main.js"]
