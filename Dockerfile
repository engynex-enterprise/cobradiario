# Backend NestJS (monorepo pnpm) para InsForge Compute (Fly.io).
# Contexto de build = raíz del repo (incluye packages/credit-engine).
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# Manifiestos primero (cacheo de capa de dependencias)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY services/package.json ./services/package.json
COPY packages/credit-engine/package.json ./packages/credit-engine/package.json
COPY web/package.json ./web/package.json
COPY app/package.json ./app/package.json
RUN pnpm install --frozen-lockfile --filter @cobradiario/api... --filter @cobradiario/credit-engine...

# Código fuente del backend + su dependencia de workspace
COPY packages/credit-engine ./packages/credit-engine
COPY services ./services
RUN pnpm --filter @cobradiario/credit-engine build \
 && pnpm --filter @cobradiario/api exec prisma generate \
 && pnpm --filter @cobradiario/api build

# --- Runtime ---
FROM node:22-slim AS runtime
# redis-server local: el plan free permite 1 solo servicio compute, así que
# Redis (BullMQ + Socket.IO) corre dentro del mismo contenedor (efímero).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates redis-server && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
ENV REDIS_URL=redis://127.0.0.1:6379
COPY --from=build /app ./
WORKDIR /app/services
EXPOSE 8080
# Arranca Redis en segundo plano y luego el API (nest build → dist/src/main.js).
CMD ["sh", "-c", "redis-server --daemonize yes --save '' --appendonly no && exec node dist/src/main.js"]
