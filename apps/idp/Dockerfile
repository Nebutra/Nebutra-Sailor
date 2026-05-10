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
COPY apps/idp/package.json ./apps/idp/

# Internal workspace packages that @nebutra/idp depends on.
# Derived from the "dependencies" field in apps/idp/package.json
# and transitive workspace deps.
COPY packages/iam/oauth-server/package.json   ./packages/iam/oauth-server/
COPY packages/commerce/contracts/package.json ./packages/commerce/contracts/
COPY packages/platform/db/package.json        ./packages/platform/db/
COPY packages/design/tokens/package.json      ./packages/design/tokens/
COPY packages/design/ui/package.json          ./packages/design/ui/
COPY packages/design/brand/package.json       ./packages/design/brand/
COPY packages/design/theme/package.json       ./packages/design/theme/

# Install only the closure needed for @nebutra/idp (and its workspace deps).
# @nebutra/db is added as an explicit filter target so its devDependencies
# (prisma CLI) are installed for the prisma generate step in the builder.
RUN pnpm install --frozen-lockfile --filter @nebutra/idp... --filter @nebutra/db...

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS builder
WORKDIR /app

RUN corepack enable pnpm

# Restore node_modules from the deps stage.
COPY --from=deps /app/node_modules            ./node_modules
COPY --from=deps /app/apps/idp/node_modules   ./apps/idp/node_modules

# Copy full source tree (respects .dockerignore at the repo root)
COPY . .

# Generate Prisma client (db package is a transitive runtime dep)
RUN pnpm --filter @nebutra/db db:generate

# Build @nebutra/brand (used by @nebutra/ui at runtime)
RUN pnpm --filter @nebutra/brand build

# Build @nebutra/idp; next.config.ts has output: 'standalone'
RUN pnpm --filter @nebutra/idp build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS runner
WORKDIR /app

ENV NODE_ENV=production
# IDP listens on 3100 (matches package.json `dev` script and docker-compose port mapping)
ENV PORT=3100

# Non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server bundle produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/idp/.next/standalone ./

# Static assets must sit alongside the standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/apps/idp/.next/static ./apps/idp/.next/static

USER nextjs

EXPOSE 3100

CMD ["node", "apps/idp/server.js"]
