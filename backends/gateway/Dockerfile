# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS deps
WORKDIR /app

RUN corepack enable pnpm

# Copy manifests for the gateway workspace and its package dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backends/gateway/package.json ./backends/gateway/
# Gateway imports a broad workspace graph. Copy package sources in the deps
# stage so pnpm can resolve every workspace:* edge without a stale hand list.
COPY packages/ ./packages/

# @nebutra/db is added as an explicit filter target so its devDependencies
# (prisma CLI) are installed — transitive workspace deps only get prod deps.
RUN pnpm install --frozen-lockfile --filter @nebutra/gateway... --filter @nebutra/db...

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder
WORKDIR /app

RUN corepack enable pnpm

# All deps are hoisted to root node_modules via public-hoist-pattern[]=* in .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backends/gateway/node_modules ./backends/gateway/node_modules
COPY . .

RUN pnpm --filter @nebutra/db db:generate
RUN pnpm --filter @nebutra/gateway build

# ── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runner
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

CMD ["node", "dist/node.js"]
