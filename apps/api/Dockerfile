# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Copy workspace manifests only (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json         ./packages/config/
COPY packages/shared-types/package.json   ./packages/shared-types/
COPY packages/db/package.json             ./packages/db/
COPY packages/ui/package.json             ./packages/ui/
COPY apps/api/package.json                ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules        ./node_modules
COPY --from=deps /app/packages/config/node_modules    ./packages/config/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/db/node_modules        ./packages/db/node_modules
COPY --from=deps /app/packages/ui/node_modules        ./packages/ui/node_modules
COPY --from=deps /app/apps/api/node_modules           ./apps/api/node_modules

# Copy full source
COPY . .

# Generate Prisma client
RUN pnpm --filter @grwfit/db exec prisma generate

# Build shared packages first
RUN pnpm --filter @grwfit/shared-types build

# Build the API
RUN pnpm --filter @grwfit/api run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/node_modules              ./node_modules
COPY --from=builder /app/packages/db/node_modules  ./packages/db/node_modules
COPY --from=builder /app/packages/db/prisma        ./packages/db/prisma
COPY --from=builder /app/apps/api/dist             ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules     ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json     ./apps/api/package.json

# Prisma generated client (Linux engine binary created during build)
COPY --from=builder /app/node_modules/.prisma      ./node_modules/.prisma

WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
