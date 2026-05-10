# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS deps
WORKDIR /app

RUN corepack enable pnpm

# Copy manifests for workspace packages api-gateway depends on
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/
COPY backends/gateway/package.json ./backends/gateway/
COPY packages/platform/alerting/package.json ./packages/platform/alerting/
COPY packages/integrations/cache/package.json ./packages/integrations/cache/
COPY packages/platform/db/package.json ./packages/platform/db/
COPY packages/platform/health/package.json ./packages/platform/health/
COPY packages/platform/logger/package.json ./packages/platform/logger/
COPY packages/platform/rate-limit/package.json ./packages/platform/rate-limit/

# @nebutra/db is added as an explicit filter target so its devDependencies
# (prisma CLI) are installed — transitive workspace deps only get prod deps.
RUN pnpm install --frozen-lockfile --filter @nebutra/api-gateway... --filter @nebutra/db...

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS builder
WORKDIR /app

RUN corepack enable pnpm

# All deps are hoisted to root node_modules via public-hoist-pattern[]=* in .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backends/gateway/node_modules ./backends/gateway/node_modules
COPY . .

RUN pnpm --filter @nebutra/db db:generate
RUN pnpm --filter @nebutra/api-gateway build

# ── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS runner
WORKDIR /app

ENV NODE_ENV=production

# Drop root — run as unprivileged user (mirrors Next.js Dockerfile convention)
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/backends/gateway/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/backends/gateway/node_modules ./backends/gateway/node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages

USER appuser

EXPOSE 3002

CMD ["node", "dist/index.js"]
