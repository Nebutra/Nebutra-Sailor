# ── Stage 1: Install dependencies ────────────────────────────────────────────
# Only package manifests are copied here so Docker can cache the layer
# and skip re-installing when only source code changes.
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS deps
WORKDIR /app

RUN corepack enable pnpm

# Root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/

# App manifest
COPY apps/landing-page/package.json ./apps/landing-page/

# Internal workspace packages that @nebutra/landing-page depends on.
# Derived from the "dependencies" field in apps/landing-page/package.json:
#   @nebutra/brand, @nebutra/ui, @nebutra/marketing, @nebutra/sanity, @nebutra/tokens
COPY packages/design/brand/package.json      ./packages/design/brand/
COPY packages/design/ui/package.json         ./packages/design/ui/
COPY packages/design/tokens/package.json     ./packages/design/tokens/
COPY packages/commerce/marketing/package.json  ./packages/commerce/marketing/
COPY packages/ops/sanity/package.json     ./packages/ops/sanity/
COPY packages/design/theme/package.json      ./packages/design/theme/

# Install only the closure needed for @nebutra/landing-page (and its workspace deps)
RUN pnpm install --frozen-lockfile --filter @nebutra/landing-page...

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS builder
WORKDIR /app

RUN corepack enable pnpm

# Restore node_modules from the deps stage
COPY --from=deps /app/node_modules                     ./node_modules
COPY --from=deps /app/apps/landing-page/node_modules   ./apps/landing-page/node_modules

# Copy full source tree (respects .dockerignore at the repo root)
COPY . .

# Build @nebutra/brand (tsup) — needed at runtime by @nebutra/ui and landing components.
# The landing-page build script runs `pnpm --filter @nebutra/brand sync` (asset copy)
# but the brand package also needs its TypeScript compiled first.
RUN pnpm --filter @nebutra/brand build

# Build @nebutra/marketing (tsup) — exports from dist/, must be compiled before the app.
RUN pnpm --filter @nebutra/marketing build

# Build @nebutra/landing-page; next.config.ts must have output: 'standalone'
RUN pnpm --filter @nebutra/landing-page build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS runner
WORKDIR /app

ENV NODE_ENV=production
# Landing page runs on 3001 to avoid collision with @nebutra/web (3000)
ENV PORT=3001

# Non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server bundle produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing-page/.next/standalone ./

# Static assets must sit alongside the standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing-page/.next/static ./apps/landing-page/.next/static

# Public directory (if it exists) is not bundled into standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/landing-page/public ./apps/landing-page/public

USER nextjs

EXPOSE 3001

# next.js standalone server entrypoint
CMD ["node", "apps/landing-page/server.js"]
