# ── Stage 1: Install dependencies ────────────────────────────────────────────
# Only package manifests are copied here so Docker can cache the layer
# and skip re-installing when only source code changes.
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS deps
WORKDIR /app

RUN corepack enable pnpm

# Root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/

# App manifest
COPY apps/landing/package.json ./apps/landing/

# Internal workspace packages that @nebutra/landing depends on.
# Derived from the "dependencies" field in apps/landing/package.json:
#   @nebutra/brand, @nebutra/ui, @nebutra/marketing, @nebutra/sanity, @nebutra/tokens
COPY packages/design/brand/package.json      ./packages/design/brand/
COPY packages/design/ui/package.json         ./packages/design/ui/
COPY packages/design/tokens/package.json     ./packages/design/tokens/
COPY packages/commerce/marketing/package.json  ./packages/commerce/marketing/
COPY packages/ops/sanity/package.json     ./packages/ops/sanity/
COPY packages/design/theme/package.json      ./packages/design/theme/

# Install only the closure needed for @nebutra/landing (and its workspace deps)
RUN pnpm install --frozen-lockfile --filter @nebutra/landing...

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder
WORKDIR /app

RUN corepack enable pnpm

# Restore node_modules from the deps stage
COPY --from=deps /app/node_modules                     ./node_modules
COPY --from=deps /app/apps/landing/node_modules   ./apps/landing/node_modules

# Copy full source tree (respects .dockerignore at the repo root)
COPY . .

# Build @nebutra/brand (tsup) — needed at runtime by @nebutra/ui and landing components.
# The landing build script runs `pnpm --filter @nebutra/brand sync` (asset copy)
# but the brand package also needs its TypeScript compiled first.
RUN pnpm --filter @nebutra/brand build

# Build @nebutra/marketing (tsup) — exports from dist/, must be compiled before the app.
RUN pnpm --filter @nebutra/marketing build

# Build @nebutra/landing; next.config.ts must have output: 'standalone'
RUN pnpm --filter @nebutra/landing build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runner
WORKDIR /app

ENV NODE_ENV=production
# Landing page runs on 3001 to avoid collision with @nebutra/web (3000)
ENV PORT=3001

# Non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server bundle produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/standalone ./

# Static assets must sit alongside the standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/.next/static ./apps/landing/.next/static

# Public directory (if it exists) is not bundled into standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing/public ./apps/landing/public

USER nextjs

EXPOSE 3001

# next.js standalone server entrypoint
CMD ["node", "apps/landing/server.js"]
