# syntax=docker/dockerfile:1

# ---- Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Full dependencies (for build) ----
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- Production dependencies (runtime only) ----
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# The built app and its lightweight runtime dependencies.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

EXPOSE 3000

# adapter-node serves on $HOST:$PORT. Configure API_URL and ORIGIN in Coolify.
CMD ["bun", "./build/index.js"]
