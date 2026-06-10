# Stage 1: Build (includes all dev deps for build + drizzle-kit for migrate)
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:1 AS runtime
WORKDIR /app
# Copy build output (svelte-adapter-bun produces build/ directory)
COPY --from=builder /app/build ./build
# Copy ALL node_modules (including drizzle-kit devDep needed for pre-start migrate step)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
# drizzle migrations folder (contains SQL files to apply)
COPY --from=builder /app/drizzle ./drizzle
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
# Note: CMD is overridden by docker-compose.prod.yml command (runs migrations first)
# Default: start web server directly (no migrations — use compose for production)
CMD ["bun", "run", "build/index.js"]
