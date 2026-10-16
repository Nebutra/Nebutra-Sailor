# Nebutra Status — one self-hosted image: public pages, API and monitors.
#
# Build from the repository root:
#   docker build -f apps/status/Dockerfile -t nebutra-status .
#
# On start the container applies pending migrations (`prisma migrate deploy`
# against STATUS_DATABASE_URL), then serves on :3140.

# ── Stage 1: dependencies ─────────────────────────────────────────────────────
# `pnpm fetch` needs only the lockfile, so this layer survives source edits.
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/
RUN pnpm fetch

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter "@nebutra/status-app..."
ENV NEXT_TELEMETRY_DISABLED=1
# Builds the workspace packages the app imports (ui, tokens, icons, fonts, …),
# then the app itself: `prisma generate && next build` with output: standalone.
RUN pnpm exec turbo run build --filter="@nebutra/status-app..."

# ── Stage 3: migrator ─────────────────────────────────────────────────────────
# The standalone bundle carries no Prisma CLI. Install exactly the CLI version
# the app was built with next to its config and migrations.
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS migrator
WORKDIR /opt/migrate
COPY --from=builder /app/apps/status/node_modules/prisma/package.json /tmp/prisma-package.json
RUN version="$(node -p "require('/tmp/prisma-package.json').version")" \
 && echo '{"private":true,"type":"module"}' > package.json \
 && npm install --omit=dev --no-audit --no-fund "prisma@${version}"
COPY apps/status/prisma.config.ts ./prisma.config.ts
COPY apps/status/prisma ./prisma

# ── Stage 4: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine@sha256:92d51e5f20b7ff58faa5a969af1a1cec6cbec3fbff7e0f523242b9b5c85ad887 AS runner
WORKDIR /app
RUN apk add --no-cache openssl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 status

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3140 \
    HOSTNAME=0.0.0.0

COPY --from=migrator --chown=status:nodejs /opt/migrate /opt/migrate
COPY --from=builder --chown=status:nodejs /app/apps/status/.next/standalone ./
COPY --from=builder --chown=status:nodejs /app/apps/status/.next/static ./apps/status/.next/static

USER status
EXPOSE 3140

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3140/api/healthz >/dev/null || exit 1

CMD ["sh", "-c", "cd /opt/migrate && node node_modules/prisma/build/index.js migrate deploy && cd /app && exec node apps/status/server.js"]
