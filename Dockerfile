# syntax=docker/dockerfile:1

# ---- Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Dependencias completas (para build) ----
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- Dependencias de producción (solo runtime) ----
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# La app compilada (adapter-node) + deps de runtime (mongodb)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

EXPOSE 3000

# adapter-node sirve en $HOST:$PORT. Coolify inyecta las env vars (MONGODB_URI, AUTH_PIN, ORIGIN, ...).
CMD ["bun", "./build/index.js"]
