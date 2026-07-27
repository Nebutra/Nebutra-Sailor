#!/usr/bin/env bash
# Remote-side helper for the Cloud VM deploy workflow.
#
# Invoked over SSH by .github/workflows/deploy-ecs.yml after bundles have been
# uploaded to BUNDLE_DIR on the VM. Unpacks each bundle into a timestamped
# release directory, atomically swaps the `current` symlink, and reloads PM2.
#
# Inputs (env vars):
#   DEPLOY_ROOT   — base directory (default /var/www/nebutra)
#   APPS          — space-separated list of apps to deploy (landing web api idp)
#   KEEP_RELEASES — number of past releases to retain (default 5)
#   PM2_CONFIG    — absolute path to ecosystem.config.cjs that should be loaded
#                   on first run; subsequent runs use `pm2 reload` for zero downtime.
#   BUNDLE_DIR    — directory containing uploaded tarballs
#                   (default /tmp for backwards compatibility).
#
# Tarball naming convention:
#   $BUNDLE_DIR/nebutra-<app>-<sha>.tar.gz
#
# Exits non-zero on any failure so the GH Actions step fails loudly.

set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/nebutra}"
APPS="${APPS:-landing web api idp auth design-docs sailor-docs router forge}"
# Keep 2 releases per app for one-step rollback. Pre/post prune only touch
# THAT app's releases/ dir (never other apps). Override with VM_KEEP_RELEASES
# / ECS_KEEP_RELEASES on small disks if needed.
KEEP_RELEASES="${KEEP_RELEASES:-2}"
PM2_CONFIG="${PM2_CONFIG:-$DEPLOY_ROOT/ecosystem.config.cjs}"
SHA="${SHA:?SHA env var required}"
BUNDLE_DIR="${BUNDLE_DIR:-/tmp}"
MODE="${MODE:-deploy}"

capture_deploy_runtime_env() {
  local key value
  for key in "$@"; do
    value="${!key:-}"
    printf -v "DEPLOY_$key" '%s' "$value"
  done
}

DEPLOY_RUNTIME_KEYS=(
  DATABASE_URL DIRECT_URL SUPABASE_DATABASE_URL SUPABASE_DIRECT_URL
  AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER VITE_AUTH_PROVIDER VITE_API_GATEWAY_URL VITE_AUTH_API_URL
  BETTER_AUTH_SECRET BETTER_AUTH_URL NEXT_PUBLIC_AUTH_URL AUTH_COOKIE_DOMAIN AUTH_RETURN_ALLOWED_HOSTS
  BETTER_AUTH_TRUSTED_ORIGINS NEXT_PUBLIC_FORGE_URL NEXT_PUBLIC_ROUTER_URL
  NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_GATEWAY_URL
  NEXT_PUBLIC_STUDIO_URL NEXT_PUBLIC_DOCS_URL NEBUTRA_LANDING_ORIGIN
  NEBUTRA_SESSION_HINT_DOMAIN DOMAIN_LANDING DOMAIN_APP DOMAIN_API DOMAIN_AUTH DOMAIN_STUDIO
  LANDING_URL WEB_URL AUTH_URL STUDIO_URL CORS_ORIGINS
  UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN UPSTASH_REDIS_URL UPSTASH_REDIS_TOKEN
  REDIS_URL OIDC_ISSUER OIDC_COOKIE_KEYS OIDC_ENABLE_CLIENT_CREDENTIALS
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET NEXT_PUBLIC_GOOGLE_CLIENT_ID
  GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET
  SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_WEBHOOK_SECRET NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  RESEND_API_KEY RESEND_AUDIENCE_ID RESEND_FROM EMAIL_FROM EMAIL_PROVIDER
  SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS
  STRIPE_SECRET_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET
  STRIPE_PRICE_ID_PRO_MONTHLY STRIPE_PRICE_ID_PRO_YEARLY
  PRICE_ID_PRO_MONTHLY PRICE_ID_PRO_YEARLY STRIPE_PRICE_ID_STARTUP_LICENSE
  OPENAI_API_KEY OPENAI_BASE_URL OPENROUTER_API_KEY OPENROUTER_BASE_URL SILICONFLOW_API_KEY
  UPLOAD_PROVIDER UPLOAD_DIR UPLOADS_PUBLIC_BASE_URL UPLOAD_HTTP_BASE_URL UPLOAD_MAX_CONCURRENCY
  R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_PUBLIC_URL
  R2_BUCKET R2_BUCKET_ASSETS R2_BUCKET_UPLOADS R2_BUCKET_BACKUPS
  AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION S3_BUCKET S3_PUBLIC_URL
  BLOB_READ_WRITE_TOKEN
  SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN SENTRY_RELEASE LOGGER_SENTRY_ENABLED
  POSTHOG_KEY POSTHOG_HOST NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST
  CRON_SECRET TURNSTILE_SECRET_KEY NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ADMIN_API_KEY SERVICE_SECRET INTERNAL_API_KEY
  CLICKHOUSE_URL CLICKHOUSE_HTTP_URL CLICKHOUSE_USERNAME CLICKHOUSE_USER
  CLICKHOUSE_PASSWORD CLICKHOUSE_DATABASE AUDIT_USE_CLICKHOUSE METERING_PROVIDER
  QSTASH_TOKEN QSTASH_CURRENT_SIGNING_KEY QSTASH_NEXT_SIGNING_KEY QSTASH_CALLBACK_BASE_URL
  INNGEST_EVENT_KEY INNGEST_SIGNING_KEY
  SANITY_API_TOKEN NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET
  NEXT_PUBLIC_SANITY_API_VERSION SANITY_WEBHOOK_SECRET
  GOOGLE_SITE_VERIFICATION
)
capture_deploy_runtime_env "${DEPLOY_RUNTIME_KEYS[@]}"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "::error:: $*" >&2; exit 1; }

case "$APPS" in
  *landing*|*web*|*api*|*idp*|*auth*|*design-docs*|*sailor-docs*|*router*|*forge*) : ;;
  *) fail "APPS must contain at least one of: landing web api idp auth design-docs sailor-docs router forge (got: $APPS)" ;;
esac

mkdir -p "$DEPLOY_ROOT"

# Clean stale bundles from prior failed runs so the staging directory doesn't fill the disk.
# Anything not matching the current SHA is from a previous run; safe to drop.
mkdir -p "$BUNDLE_DIR"
find "$BUNDLE_DIR" -maxdepth 1 -name 'nebutra-*.tar.gz' \
     ! -name "nebutra-*-${SHA}.tar.gz" -mtime +0 -delete 2>/dev/null || true

preserve_runtime_env() {
  local app_root="$1" release="$2"
  local previous_env="$app_root/current/.env"
  local release_env="$release/.env"

  if [ -f "$previous_env" ] && [ ! -f "$release_env" ]; then
    cp -p "$previous_env" "$release_env"
    log "preserved runtime env: $previous_env -> $release_env"
  fi
}

source_runtime_env_file() {
  local env_file="$1"

  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
}

generate_runtime_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  else
    echo "$(date -u +%s%N)-runtime-secret"
  fi
}

# Encode a value for a dotenv file (KEY=VALUE).
# Never use printf %q here: bash-shell escaping turns URL query `?` into `\?`,
# which Prisma/Node then treat as part of the database name
# (error: database "nebutra\" does not exist). Dotenv is not bash.
encode_dotenv_value() {
  local value="$1"
  # Collapse prior printf-%q over-escapes before URL specials (? & = #)
  value="$(printf '%s' "$value" | sed -E 's/\\+([?&=#])/\1/g')"

  if [[ "$value" == *$'\n'* ]]; then
    value="$(printf '%s' "$value" | tr '\n' ' ')"
  fi

  # Quote only when dotenv needs it (spaces, #, quotes)
  if [[ "$value" =~ [[:space:]#\'\"] ]]; then
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    printf '"%s"' "$value"
  else
    printf '%s' "$value"
  fi
}

append_env_assignment() {
  local env_file="$1" key="$2" value="$3"
  [ -n "$value" ] || return 0
  {
    printf '%s=' "$key"
    encode_dotenv_value "$value"
    printf '\n'
  } >> "$env_file"
}

ensure_env_assignment() {
  local env_file="$1" key="$2" value="$3"
  [ -n "$value" ] || return 0
  if [ -f "$env_file" ] && grep -qE "^${key}=" "$env_file"; then
    return 0
  fi
  append_env_assignment "$env_file" "$key" "$value"
}

replace_env_assignment() {
  local env_file="$1" key="$2" value="$3"
  [ -n "$value" ] || return 0
  mkdir -p "$(dirname "$env_file")"
  touch "$env_file"
  chmod 600 "$env_file"
  local tmp
  tmp="$(mktemp)"
  grep -vE "^${key}=" "$env_file" > "$tmp" || true
  cat "$tmp" > "$env_file"
  rm -f "$tmp"
  append_env_assignment "$env_file" "$key" "$value"
  chmod 600 "$env_file"
}

runtime_env_value() {
  local key="$1"
  local deploy_key="DEPLOY_$key"
  local value="${!deploy_key:-}"

  if [ -z "$value" ]; then
    value="${!key:-}"
  fi

  printf '%s' "$value"
}

persist_runtime_keys() {
  local app_root="$1" label="$2"
  shift 2

  local env_file="$app_root/.env"
  local key value count=0

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"

  for key in "$@"; do
    value="$(runtime_env_value "$key")"
    [ -n "$value" ] || continue
    export "$key=$value"
    replace_env_assignment "$env_file" "$key" "$value"
    count=$((count + 1))
  done

  if [ "$count" -gt 0 ]; then
    log "ensured $label runtime env keys ($count): $env_file"
  fi
}

persist_database_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local database_url direct_url supabase_database_url supabase_direct_url

  database_url="$(runtime_env_value DATABASE_URL)"
  supabase_database_url="$(runtime_env_value SUPABASE_DATABASE_URL)"
  direct_url="$(runtime_env_value DIRECT_URL)"
  supabase_direct_url="$(runtime_env_value SUPABASE_DIRECT_URL)"

  if [ -z "$database_url" ] && [ -n "$supabase_database_url" ]; then
    database_url="$supabase_database_url"
  fi
  if [ -z "$direct_url" ] && [ -n "$supabase_direct_url" ]; then
    direct_url="$supabase_direct_url"
  fi

  [ -n "$database_url$direct_url$supabase_database_url$supabase_direct_url" ] || return 0

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"

  if [ -n "$database_url" ]; then
    export DATABASE_URL="$database_url"
    replace_env_assignment "$env_file" DATABASE_URL "$database_url"
  fi
  if [ -n "$direct_url" ]; then
    export DIRECT_URL="$direct_url"
    replace_env_assignment "$env_file" DIRECT_URL "$direct_url"
  fi
  replace_env_assignment "$env_file" SUPABASE_DATABASE_URL "$supabase_database_url"
  replace_env_assignment "$env_file" SUPABASE_DIRECT_URL "$supabase_direct_url"
  log "ensured database runtime env: $env_file"
}

persist_redis_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local redis_url="${DEPLOY_UPSTASH_REDIS_REST_URL:-${DEPLOY_UPSTASH_REDIS_URL:-${UPSTASH_REDIS_REST_URL:-${UPSTASH_REDIS_URL:-}}}}"
  local redis_token="${DEPLOY_UPSTASH_REDIS_REST_TOKEN:-${DEPLOY_UPSTASH_REDIS_TOKEN:-${UPSTASH_REDIS_REST_TOKEN:-${UPSTASH_REDIS_TOKEN:-}}}}"

  if [ -z "$redis_url$redis_token" ]; then
    return 0
  fi

  if [ -z "$redis_url" ] || [ -z "$redis_token" ]; then
    fail "Redis runtime env incomplete: configure both Upstash Redis URL and token"
  fi

  export UPSTASH_REDIS_REST_URL="$redis_url"
  export UPSTASH_REDIS_REST_TOKEN="$redis_token"
  export UPSTASH_REDIS_URL="$redis_url"
  export UPSTASH_REDIS_TOKEN="$redis_token"

  replace_env_assignment "$env_file" UPSTASH_REDIS_REST_URL "$redis_url"
  replace_env_assignment "$env_file" UPSTASH_REDIS_REST_TOKEN "$redis_token"
  replace_env_assignment "$env_file" UPSTASH_REDIS_URL "$redis_url"
  replace_env_assignment "$env_file" UPSTASH_REDIS_TOKEN "$redis_token"
  log "ensured Upstash Redis runtime env: $env_file"
}

persist_google_auth_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local google_client_id="${DEPLOY_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
  local google_client_secret="${DEPLOY_GOOGLE_CLIENT_SECRET:-${GOOGLE_CLIENT_SECRET:-}}"
  local public_google_client_id="${DEPLOY_NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${google_client_id:-}}}"

  if [ -z "$google_client_id$google_client_secret$public_google_client_id" ]; then
    return 0
  fi

  if [ -n "$google_client_id" ] && [ -z "$public_google_client_id" ]; then
    public_google_client_id="$google_client_id"
  fi

  if [ -z "$google_client_id" ] || [ -z "$google_client_secret" ]; then
    fail "Google OAuth runtime env incomplete: configure both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
  fi

  replace_env_assignment "$env_file" GOOGLE_CLIENT_ID "$google_client_id"
  replace_env_assignment "$env_file" GOOGLE_CLIENT_SECRET "$google_client_secret"
  replace_env_assignment "$env_file" NEXT_PUBLIC_GOOGLE_CLIENT_ID "$public_google_client_id"
  log "ensured Google OAuth runtime env: $env_file"
}

persist_google_public_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local google_client_id="${DEPLOY_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
  local public_google_client_id="${DEPLOY_NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${google_client_id:-}}}"

  if [ -z "$public_google_client_id" ]; then
    return 0
  fi

  replace_env_assignment "$env_file" NEXT_PUBLIC_GOOGLE_CLIENT_ID "$public_google_client_id"
  log "ensured Google public runtime env: $env_file"
}

persist_github_auth_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local github_client_id="${DEPLOY_GITHUB_CLIENT_ID:-${GITHUB_CLIENT_ID:-}}"
  local github_client_secret="${DEPLOY_GITHUB_CLIENT_SECRET:-${GITHUB_CLIENT_SECRET:-}}"

  if [ -z "$github_client_id$github_client_secret" ]; then
    return 0
  fi

  if [ -z "$github_client_id" ] || [ -z "$github_client_secret" ]; then
    fail "GitHub OAuth runtime env incomplete: configure both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
  fi

  replace_env_assignment "$env_file" GITHUB_CLIENT_ID "$github_client_id"
  replace_env_assignment "$env_file" GITHUB_CLIENT_SECRET "$github_client_secret"
  log "ensured GitHub OAuth runtime env: $env_file"
}

persist_web_mvp_runtime_env() {
  local app_root="$1"

  persist_runtime_keys "$app_root" "web MVP" \
    AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER BETTER_AUTH_SECRET BETTER_AUTH_URL \
    VITE_AUTH_PROVIDER VITE_API_GATEWAY_URL VITE_AUTH_API_URL \
    NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_GATEWAY_URL \
    NEXT_PUBLIC_STUDIO_URL NEBUTRA_LANDING_ORIGIN NEBUTRA_SESSION_HINT_DOMAIN \
    SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
    SUPABASE_WEBHOOK_SECRET NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SUPABASE_ANON_KEY \
    RESEND_API_KEY RESEND_AUDIENCE_ID RESEND_FROM EMAIL_FROM EMAIL_PROVIDER \
    SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS \
    STRIPE_SECRET_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET \
    STRIPE_PRICE_ID_PRO_MONTHLY STRIPE_PRICE_ID_PRO_YEARLY PRICE_ID_PRO_MONTHLY PRICE_ID_PRO_YEARLY \
    OPENAI_API_KEY OPENAI_BASE_URL OPENROUTER_API_KEY OPENROUTER_BASE_URL SILICONFLOW_API_KEY \
    UPLOAD_PROVIDER UPLOAD_DIR UPLOADS_PUBLIC_BASE_URL UPLOAD_HTTP_BASE_URL UPLOAD_MAX_CONCURRENCY \
    R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_PUBLIC_URL \
    R2_BUCKET R2_BUCKET_ASSETS R2_BUCKET_UPLOADS R2_BUCKET_BACKUPS \
    AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION S3_BUCKET S3_PUBLIC_URL BLOB_READ_WRITE_TOKEN \
    SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN SENTRY_RELEASE LOGGER_SENTRY_ENABLED \
    POSTHOG_KEY POSTHOG_HOST NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST \
    CRON_SECRET TURNSTILE_SECRET_KEY NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    ADMIN_API_KEY SERVICE_SECRET INTERNAL_API_KEY \
    CLICKHOUSE_URL CLICKHOUSE_HTTP_URL CLICKHOUSE_USERNAME CLICKHOUSE_USER CLICKHOUSE_PASSWORD CLICKHOUSE_DATABASE \
    QSTASH_TOKEN QSTASH_CURRENT_SIGNING_KEY QSTASH_NEXT_SIGNING_KEY QSTASH_CALLBACK_BASE_URL \
    INNGEST_EVENT_KEY INNGEST_SIGNING_KEY \
    SANITY_API_TOKEN NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET NEXT_PUBLIC_SANITY_API_VERSION
}

persist_api_mvp_runtime_env() {
  local app_root="$1"

  persist_runtime_keys "$app_root" "api MVP" \
    AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER BETTER_AUTH_SECRET BETTER_AUTH_URL \
    DOMAIN_LANDING DOMAIN_APP DOMAIN_API DOMAIN_STUDIO LANDING_URL WEB_URL STUDIO_URL CORS_ORIGINS \
    SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_WEBHOOK_SECRET \
    RESEND_API_KEY RESEND_FROM EMAIL_FROM EMAIL_PROVIDER SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS \
    STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID_PRO_MONTHLY STRIPE_PRICE_ID_PRO_YEARLY \
    PRICE_ID_PRO_MONTHLY PRICE_ID_PRO_YEARLY \
    OPENAI_API_KEY OPENAI_BASE_URL OPENROUTER_API_KEY OPENROUTER_BASE_URL SILICONFLOW_API_KEY \
    R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_PUBLIC_URL \
    R2_BUCKET R2_BUCKET_ASSETS R2_BUCKET_UPLOADS R2_BUCKET_BACKUPS \
    AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION S3_BUCKET S3_PUBLIC_URL BLOB_READ_WRITE_TOKEN \
    SENTRY_DSN SENTRY_RELEASE LOGGER_SENTRY_ENABLED \
    CRON_SECRET TURNSTILE_SECRET_KEY ADMIN_API_KEY SERVICE_SECRET INTERNAL_API_KEY \
    CLICKHOUSE_URL CLICKHOUSE_HTTP_URL CLICKHOUSE_USERNAME CLICKHOUSE_USER CLICKHOUSE_PASSWORD CLICKHOUSE_DATABASE \
    AUDIT_USE_CLICKHOUSE METERING_PROVIDER \
    QSTASH_TOKEN QSTASH_CURRENT_SIGNING_KEY QSTASH_NEXT_SIGNING_KEY QSTASH_CALLBACK_BASE_URL \
    INNGEST_EVENT_KEY INNGEST_SIGNING_KEY SANITY_WEBHOOK_SECRET \
    REDIS_URL CACHE_BACKEND

  # ECS hosts a local Redis container (nebutra-redis-lite on 127.0.0.1:6379).
  # @nebutra/cache only accepts CACHE_BACKEND=ioredis|upstash-redis — values
  # like "cloudflare-kv" fall through to Upstash and mark health degraded/down.
  local env_file="$app_root/.env"
  if [ -z "${REDIS_URL:-}" ]; then
    REDIS_URL="redis://127.0.0.1:6379"
    export REDIS_URL
  fi
  if [ -z "${CACHE_BACKEND:-}" ] || [ "${CACHE_BACKEND}" = "cloudflare-kv" ]; then
    CACHE_BACKEND="ioredis"
    export CACHE_BACKEND
  fi
  replace_env_assignment "$env_file" REDIS_URL "$REDIS_URL"
  replace_env_assignment "$env_file" CACHE_BACKEND "$CACHE_BACKEND"
}

persist_idp_runtime_env() {
  local app_root="$1"

  persist_database_runtime_env "$app_root"
  persist_runtime_keys "$app_root" "idp SSO" \
    DATABASE_URL DIRECT_URL SUPABASE_DATABASE_URL SUPABASE_DIRECT_URL \
    REDIS_URL OIDC_ISSUER OIDC_COOKIE_KEYS OIDC_ENABLE_CLIENT_CREDENTIALS \
    SENTRY_DSN SENTRY_RELEASE LOGGER_SENTRY_ENABLED
}

persist_landing_mvp_runtime_env() {
  local app_root="$1"

  persist_runtime_keys "$app_root" "landing MVP" \
    NEXT_PUBLIC_AUTH_PROVIDER NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_DOCS_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP \
    RESEND_API_KEY RESEND_AUDIENCE_ID RESEND_FROM EMAIL_FROM EMAIL_PROVIDER \
    STRIPE_SECRET_KEY STRIPE_PRICE_ID_STARTUP_LICENSE \
    SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN SENTRY_RELEASE LOGGER_SENTRY_ENABLED \
    POSTHOG_KEY POSTHOG_HOST NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET NEXT_PUBLIC_SANITY_API_VERSION \
    SANITY_API_TOKEN SANITY_WEBHOOK_SECRET GOOGLE_SITE_VERIFICATION
}

bootstrap_web_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local api_env="$DEPLOY_ROOT/api/.env"

  if [ -f "$api_env" ]; then
    source_runtime_env_file "$api_env"
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(discover_local_postgres_url || true)"
    export DATABASE_URL
  fi

  AUTH_PROVIDER="${AUTH_PROVIDER:-better-auth}"
  NEXT_PUBLIC_AUTH_PROVIDER="${NEXT_PUBLIC_AUTH_PROVIDER:-$AUTH_PROVIDER}"
  VITE_AUTH_PROVIDER="${VITE_AUTH_PROVIDER:-$AUTH_PROVIDER}"
  BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(generate_runtime_secret)}"
  # Login center owns the Better Auth origin (multi-app RP model).
  BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://auth.nebutra.com}"
  NEXT_PUBLIC_AUTH_URL="${NEXT_PUBLIC_AUTH_URL:-https://auth.nebutra.com}"
  AUTH_COOKIE_DOMAIN="${AUTH_COOKIE_DOMAIN:-.nebutra.com}"
  NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.nebutra.com}"
  NEXT_PUBLIC_API_GATEWAY_URL="${NEXT_PUBLIC_API_GATEWAY_URL:-https://api.nebutra.com}"
  VITE_API_GATEWAY_URL="${VITE_API_GATEWAY_URL:-$NEXT_PUBLIC_API_GATEWAY_URL}"
  VITE_AUTH_API_URL="${VITE_AUTH_API_URL:-$VITE_API_GATEWAY_URL/api/auth}"
  NEBUTRA_LANDING_ORIGIN="${NEBUTRA_LANDING_ORIGIN:-https://nebutra.com}"
  NEBUTRA_SESSION_HINT_DOMAIN="${NEBUTRA_SESSION_HINT_DOMAIN:-.nebutra.com}"
  NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"

  export AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER VITE_AUTH_PROVIDER VITE_API_GATEWAY_URL VITE_AUTH_API_URL
  export BETTER_AUTH_SECRET BETTER_AUTH_URL NEXT_PUBLIC_AUTH_URL AUTH_COOKIE_DOMAIN
  export NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_GATEWAY_URL
  export NEBUTRA_LANDING_ORIGIN NEBUTRA_SESSION_HINT_DOMAIN

  local missing=()
  [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
  [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
  if [ "${AUTH_PROVIDER:-}" = "better-auth" ]; then
    [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
  fi
  if [ "${#missing[@]}" -gt 0 ]; then
    fail "web runtime env missing required keys after bootstrap: ${missing[*]}"
  fi

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"
  ensure_env_assignment "$env_file" NODE_ENV "production"
  ensure_env_assignment "$env_file" PORT "3000"
  ensure_env_assignment "$env_file" HOSTNAME "127.0.0.1"
  ensure_env_assignment "$env_file" DATABASE_URL "$DATABASE_URL"
  ensure_env_assignment "$env_file" AUTH_PROVIDER "$AUTH_PROVIDER"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_AUTH_PROVIDER "$NEXT_PUBLIC_AUTH_PROVIDER"
  ensure_env_assignment "$env_file" VITE_AUTH_PROVIDER "$VITE_AUTH_PROVIDER"
  ensure_env_assignment "$env_file" VITE_API_GATEWAY_URL "$VITE_API_GATEWAY_URL"
  ensure_env_assignment "$env_file" VITE_AUTH_API_URL "$VITE_AUTH_API_URL"
  ensure_env_assignment "$env_file" BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
  ensure_env_assignment "$env_file" BETTER_AUTH_URL "$BETTER_AUTH_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_AUTH_URL "$NEXT_PUBLIC_AUTH_URL"
  ensure_env_assignment "$env_file" AUTH_COOKIE_DOMAIN "$AUTH_COOKIE_DOMAIN"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_API_URL "$NEXT_PUBLIC_API_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_API_GATEWAY_URL "$NEXT_PUBLIC_API_GATEWAY_URL"
  ensure_env_assignment "$env_file" NEBUTRA_LANDING_ORIGIN "$NEBUTRA_LANDING_ORIGIN"
  ensure_env_assignment "$env_file" NEBUTRA_SESSION_HINT_DOMAIN "$NEBUTRA_SESSION_HINT_DOMAIN"
  ensure_env_assignment "$env_file" GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
  ensure_env_assignment "$env_file" GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_GOOGLE_CLIENT_ID "${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-}"
  ensure_env_assignment "$env_file" GITHUB_CLIENT_ID "${GITHUB_CLIENT_ID:-}"
  ensure_env_assignment "$env_file" GITHUB_CLIENT_SECRET "${GITHUB_CLIENT_SECRET:-}"
  chmod 600 "$env_file"
  log "ensured web runtime env: $env_file"
}

bootstrap_landing_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"

  AUTH_PROVIDER="${AUTH_PROVIDER:-better-auth}"
  NEXT_PUBLIC_AUTH_PROVIDER="${NEXT_PUBLIC_AUTH_PROVIDER:-$AUTH_PROVIDER}"
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.nebutra.com}"
  NEXT_PUBLIC_DOCS_URL="${NEXT_PUBLIC_DOCS_URL:-https://docs.nebutra.com}"
  NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
  NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP="${NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP:-true}"

  export AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL
  export NEXT_PUBLIC_DOCS_URL NEXT_PUBLIC_GOOGLE_CLIENT_ID NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"
  ensure_env_assignment "$env_file" NODE_ENV "production"
  ensure_env_assignment "$env_file" PORT "3001"
  ensure_env_assignment "$env_file" HOSTNAME "127.0.0.1"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_AUTH_PROVIDER "$NEXT_PUBLIC_AUTH_PROVIDER"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_API_URL "$NEXT_PUBLIC_API_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_DOCS_URL "$NEXT_PUBLIC_DOCS_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_GOOGLE_CLIENT_ID "$NEXT_PUBLIC_GOOGLE_CLIENT_ID"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP "$NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP"
  chmod 600 "$env_file"
  log "ensured landing runtime env: $env_file"
}

load_runtime_env() {
  local app="$1" release="$2" pm2_name="$3"
  local app_root="$DEPLOY_ROOT/$app"
  local loaded=""
  local env_file
  local candidates=(
    "$DEPLOY_ROOT/.env"
    "$DEPLOY_ROOT/.env.production"
    # web keeps the shared session secret at web/.env (not web/current/.env)
    "$DEPLOY_ROOT/web/.env"
    "$DEPLOY_ROOT/web/current/.env"
    "$app_root/.env"
    "$app_root/current/.env"
    "$release/.env"
  )

  for env_file in "${candidates[@]}"; do
    if [ -f "$env_file" ]; then
      source_runtime_env_file "$env_file"
      loaded="${loaded}${loaded:+, }$env_file"
    fi
  done

  if [ -n "$loaded" ]; then
    log "loaded runtime env for $app: $loaded"
  else
    log "no runtime env files found for $app"
  fi

  if [ "$app" = "web" ] || [ "$app" = "api" ] || [ "$app" = "idp" ] || [ "$app" = "auth" ]; then
    persist_database_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi

  if [ "$app" = "idp" ]; then
    persist_idp_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"

    OIDC_ISSUER="${OIDC_ISSUER:-https://sso.nebutra.com}"
    OIDC_ENABLE_CLIENT_CREDENTIALS="${OIDC_ENABLE_CLIENT_CREDENTIALS:-false}"

    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${REDIS_URL:-}" ] || missing+=("REDIS_URL")
    [ -n "${OIDC_COOKIE_KEYS:-}" ] || missing+=("OIDC_COOKIE_KEYS")
    if [ "${#missing[@]}" -gt 0 ]; then
      fail "idp runtime env missing required keys after env load: ${missing[*]}"
    fi

    replace_env_assignment "$app_root/.env" NODE_ENV "production"
    replace_env_assignment "$app_root/.env" PORT "3100"
    replace_env_assignment "$app_root/.env" HOSTNAME "127.0.0.1"
    replace_env_assignment "$app_root/.env" OIDC_ISSUER "$OIDC_ISSUER"
    replace_env_assignment "$app_root/.env" OIDC_ENABLE_CLIENT_CREDENTIALS "$OIDC_ENABLE_CLIENT_CREDENTIALS"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi

  if [ "$app" = "auth" ]; then
    # Login center: Better Auth authority for multi-app RPs.
    # Session secret MUST match web (shared cookie domain .nebutra.com).
    BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://auth.nebutra.com}"
    NEXT_PUBLIC_AUTH_URL="${NEXT_PUBLIC_AUTH_URL:-https://auth.nebutra.com}"
    AUTH_COOKIE_DOMAIN="${AUTH_COOKIE_DOMAIN:-.nebutra.com}"
    NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://app.nebutra.com}"
    NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://nebutra.com}"
    NEXT_PUBLIC_FORGE_URL="${NEXT_PUBLIC_FORGE_URL:-https://forge.nebutra.com}"
    NEXT_PUBLIC_ROUTER_URL="${NEXT_PUBLIC_ROUTER_URL:-https://router.nebutra.com}"
    AUTH_PROVIDER="${AUTH_PROVIDER:-better-auth}"
    # CORS trust for product RPs that call getSession() cross-origin (forge/router/app).
    BETTER_AUTH_TRUSTED_ORIGINS="${BETTER_AUTH_TRUSTED_ORIGINS:-https://forge.nebutra.com,https://router.nebutra.com,https://app.nebutra.com,https://nebutra.com,https://www.nebutra.com}"
    AUTH_RETURN_ALLOWED_HOSTS="${AUTH_RETURN_ALLOWED_HOSTS:-forge.nebutra.com,router.nebutra.com,app.nebutra.com,nebutra.com,www.nebutra.com,auth.nebutra.com}"

    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
    if [ "${#missing[@]}" -gt 0 ]; then
      load_existing_pm2_env "$pm2_name"
      missing=()
      [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
      [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
      if [ "${#missing[@]}" -gt 0 ]; then
        fail "auth-center runtime env missing required keys: ${missing[*]}"
      fi
    fi

    ensure_env_assignment "$app_root/.env" NODE_ENV "production"
    ensure_env_assignment "$app_root/.env" BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
    replace_env_assignment "$app_root/.env" PORT "3101"
    replace_env_assignment "$app_root/.env" HOSTNAME "127.0.0.1"
    replace_env_assignment "$app_root/.env" AUTH_PROVIDER "$AUTH_PROVIDER"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_AUTH_PROVIDER "$AUTH_PROVIDER"
    replace_env_assignment "$app_root/.env" BETTER_AUTH_URL "$BETTER_AUTH_URL"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_AUTH_URL "$NEXT_PUBLIC_AUTH_URL"
    replace_env_assignment "$app_root/.env" AUTH_COOKIE_DOMAIN "$AUTH_COOKIE_DOMAIN"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_FORGE_URL "$NEXT_PUBLIC_FORGE_URL"
    replace_env_assignment "$app_root/.env" NEXT_PUBLIC_ROUTER_URL "$NEXT_PUBLIC_ROUTER_URL"
    replace_env_assignment "$app_root/.env" BETTER_AUTH_TRUSTED_ORIGINS "$BETTER_AUTH_TRUSTED_ORIGINS"
    replace_env_assignment "$app_root/.env" AUTH_RETURN_ALLOWED_HOSTS "$AUTH_RETURN_ALLOWED_HOSTS"
    persist_google_auth_runtime_env "$app_root"
    persist_github_auth_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi

  if [ "$app" = "web" ]; then
    if [ ! -f "$app_root/.env" ]; then
      bootstrap_web_runtime_env "$app_root"
      source_runtime_env_file "$app_root/.env"
    fi

    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
    if [ "${AUTH_PROVIDER:-better-auth}" = "better-auth" ]; then
      [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
    fi
    if [ "${#missing[@]}" -gt 0 ]; then
      load_existing_pm2_env "$pm2_name"
      missing=()
      [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
      [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      if [ "${AUTH_PROVIDER:-better-auth}" = "better-auth" ]; then
        [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
      fi
      if [ "${#missing[@]}" -gt 0 ]; then
        bootstrap_web_runtime_env "$app_root"
        source_runtime_env_file "$app_root/.env"
      fi
    fi
  fi

  if [ "$app" = "landing" ]; then
    if [ ! -f "$app_root/.env" ]; then
      bootstrap_landing_runtime_env "$app_root"
      source_runtime_env_file "$app_root/.env"
    fi
    persist_google_public_runtime_env "$app_root"
    persist_landing_mvp_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi

  if [ "$app" = "web" ]; then
    persist_google_auth_runtime_env "$app_root"
    persist_github_auth_runtime_env "$app_root"
    persist_redis_runtime_env "$app_root"
    persist_web_mvp_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi

  if [ "$app" = "api" ]; then
    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
    if [ "${#missing[@]}" -gt 0 ]; then
      load_existing_pm2_env "$pm2_name"
      missing=()
      [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
      [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      if [ "${#missing[@]}" -gt 0 ]; then
        bootstrap_api_runtime_env "$app_root"
        source_runtime_env_file "$app_root/.env"
        missing=()
        [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
        [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      fi
      if [ "${#missing[@]}" -gt 0 ]; then
        fail "api runtime env missing required keys after env load: ${missing[*]}"
      fi
    fi

    refresh_bootstrapped_api_database_url "$app_root"
    persist_redis_runtime_env "$app_root"
    persist_api_mvp_runtime_env "$app_root"
    [ -f "$app_root/.env" ] && source_runtime_env_file "$app_root/.env"
  fi
}

refresh_bootstrapped_api_database_url() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local discovered_url=""

  if [ -n "${DATABASE_URL:-}" ] &&
     [[ "$DATABASE_URL" != "postgresql://postgres:postgres@127.0.0.1:5432/nebutra"* ]]; then
    return 0
  fi

  discovered_url="$(discover_local_postgres_url || true)"
  if [ -z "$discovered_url" ]; then
    return 0
  fi

  export DATABASE_URL="$discovered_url"

  if [ -f "$env_file" ]; then
    local tmp
    tmp="$(mktemp)"
    awk -v url="$discovered_url" '
      BEGIN { replaced = 0 }
      /^DATABASE_URL=/ {
        print "DATABASE_URL=" url
        replaced = 1
        next
      }
      { print }
      END {
        if (replaced == 0) {
          print "DATABASE_URL=" url
        }
      }
    ' "$env_file" > "$tmp"
    cat "$tmp" > "$env_file"
    rm -f "$tmp"
    chmod 600 "$env_file"
  fi

  log "refreshed bootstrapped api DATABASE_URL from local postgres container"
}

discover_local_postgres_url() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi

  local container password database
  for container in nebutra-postgres-lite nebutra-postgres postgres; do
    if ! docker inspect "$container" >/dev/null 2>&1; then
      continue
    fi

    password="$(docker inspect "$container" \
      --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | awk -F= '$1 == "POSTGRES_PASSWORD" { print substr($0, length($1) + 2); exit }')"
    database="$(docker inspect "$container" \
      --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | awk -F= '$1 == "POSTGRES_DB" { print substr($0, length($1) + 2); exit }')"

    if [ -n "$password" ]; then
      database="${database:-nebutra}"
      if command -v python3 >/dev/null 2>&1; then
        python3 - "$password" "$database" <<'PY'
import sys
from urllib.parse import quote

password = quote(sys.argv[1], safe="")
database = quote(sys.argv[2], safe="")
print(f"postgresql://postgres:{password}@127.0.0.1:5432/{database}?schema=public")
PY
      else
        echo "postgresql://postgres:${password}@127.0.0.1:5432/${database}?schema=public"
      fi
      return 0
    fi
  done
}

bootstrap_api_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"

  if [ -f "$env_file" ]; then
    source_runtime_env_file "$env_file"
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(discover_local_postgres_url || true)"
    DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/nebutra?schema=public}"
    export DATABASE_URL
  fi

  AUTH_PROVIDER="${AUTH_PROVIDER:-better-auth}"
  NEXT_PUBLIC_AUTH_PROVIDER="${NEXT_PUBLIC_AUTH_PROVIDER:-$AUTH_PROVIDER}"
  BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(generate_runtime_secret)}"

  export AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER BETTER_AUTH_SECRET

  ensure_env_assignment "$env_file" NODE_ENV "production"
  ensure_env_assignment "$env_file" PORT "3002"
  ensure_env_assignment "$env_file" HOSTNAME "127.0.0.1"
  ensure_env_assignment "$env_file" DATABASE_URL "$DATABASE_URL"
  ensure_env_assignment "$env_file" AUTH_PROVIDER "$AUTH_PROVIDER"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_AUTH_PROVIDER "$NEXT_PUBLIC_AUTH_PROVIDER"
  ensure_env_assignment "$env_file" BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
  chmod 600 "$env_file"
  log "ensured api runtime env: $env_file"
}

load_existing_pm2_env() {
  local pm2_name="$1"

  if ! pm2 describe "$pm2_name" >/dev/null 2>&1; then
    return 0
  fi

  local count=0
  local line key value
  local pm2_env_lines=""

  if command -v jq >/dev/null 2>&1; then
    pm2_env_lines=$(pm2 jlist 2>/dev/null \
      | jq -r --arg name "$pm2_name" '
          .[]
          | select(.name == $name)
          | .pm2_env
          | to_entries[]
          | select(.value | type == "string" or type == "number" or type == "boolean")
          | select(.key | test("^(DATABASE_URL|DIRECT_URL|AUTH_PROVIDER|CLERK_|BETTER_AUTH_|GOOGLE_|GITHUB_|SUPABASE_|STRIPE_|OPENAI_|OPENROUTER_|SILICONFLOW_|NEXT_PUBLIC_|VITE_|UPSTASH_|REDIS_|OIDC_|RESEND_|EMAIL_|SMTP_|SENTRY_|POSTHOG_|SANITY_|JWT_|COOKIE_|APP_|API_|DOMAIN_|LANDING_URL|WEB_URL|STUDIO_URL|CORS_ORIGINS|R2_|AWS_|S3_|BLOB_|UPLOAD_|TURNSTILE_|CRON_|ADMIN_|SERVICE_SECRET|INTERNAL_API_KEY|CLICKHOUSE_|AUDIT_USE_CLICKHOUSE|METERING_PROVIDER|QSTASH_|INNGEST_)"))
          | "\(.key)=\(.value | tostring)"
        ' || true)
  elif command -v python3 >/dev/null 2>&1; then
    pm2_env_lines=$(pm2 jlist 2>/dev/null | python3 -c '
import json
import re
import sys

name = sys.argv[1]
allow = re.compile(
    r"^(DATABASE_URL|DIRECT_URL|AUTH_PROVIDER|CLERK_|BETTER_AUTH_|GOOGLE_|GITHUB_|SUPABASE_|"
    r"STRIPE_|OPENAI_|OPENROUTER_|SILICONFLOW_|NEXT_PUBLIC_|VITE_|UPSTASH_|REDIS_|OIDC_|RESEND_|EMAIL_|"
    r"SMTP_|SENTRY_|POSTHOG_|SANITY_|JWT_|COOKIE_|APP_|API_|DOMAIN_|LANDING_URL|WEB_URL|"
    r"STUDIO_URL|CORS_ORIGINS|R2_|AWS_|S3_|BLOB_|UPLOAD_|TURNSTILE_|CRON_|ADMIN_|"
    r"SERVICE_SECRET|INTERNAL_API_KEY|CLICKHOUSE_|AUDIT_USE_CLICKHOUSE|METERING_PROVIDER|"
    r"QSTASH_|INNGEST_)"
)

try:
    procs = json.load(sys.stdin)
except Exception:
    sys.exit(0)

for proc in procs:
    if proc.get("name") != name:
        continue
    for key, value in proc.get("pm2_env", {}).items():
        if not allow.match(key):
            continue
        if isinstance(value, (str, int, float, bool)):
            print(f"{key}={value}")
    break
' "$pm2_name" || true)
  else
    log "cannot inherit runtime env from pm2 $pm2_name: jq/python3 not installed"
    return 0
  fi

  while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    if [ -n "$key" ] && [ "$key" != "$line" ]; then
      export "$key=$value"
      count=$((count + 1))
    fi
  done <<< "$pm2_env_lines"

  if [ "$count" -gt 0 ]; then
    log "inherited $count runtime env keys from existing pm2 $pm2_name"
  else
    log "no inheritable runtime env keys found in existing pm2 $pm2_name"
  fi
}

wait_for_local_http() {
  local label="$1" pm2_name="$2" url="$3" ok_regex="${4:-^(200|301|302|307)$}"
  local code="000"

  log "wait for $label local health: $url"
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || true)"
    [ -n "$code" ] || code="000"
    if [[ "$code" =~ $ok_regex ]]; then
      log "$label local health -> $code"
      return 0
    fi
    if [ "$attempt" -eq 10 ]; then
      log "$label local health failed after $attempt attempts (last code: $code)"
      pm2 describe "$pm2_name" --no-color 2>&1 || true
      pm2 logs "$pm2_name" --nostream --lines 160 --raw --no-color 2>&1 | tail -180 || true
      command -v ss >/dev/null 2>&1 && ss -ltnp 2>/dev/null | grep -E ':(3000|3001|3002|3004|3005)\b' || true
      fail "$label failed local health check"
    fi
    sleep 6
  done
}

deploy_one() {
  local app="$1" pm2_name="$2"
  local tarball="$BUNDLE_DIR/nebutra-${app}-${SHA}.tar.gz"
  if [ ! -f "$tarball" ]; then
    log "skip $app — no tarball at $tarball"
    return 0
  fi

  local app_root="$DEPLOY_ROOT/$app"
  local releases="$app_root/releases"
  local stamp
  stamp="$(date -u +%Y%m%d-%H%M%S)-${SHA:0:7}"
  local release="$releases/$stamp"
  local previous_marker="$app_root/.previous"

  if [ -f "$app_root/current/.env" ] && [ ! -f "$app_root/.env" ]; then
    cp -p "$app_root/current/.env" "$app_root/.env" || true
    chmod 600 "$app_root/.env" 2>/dev/null || true
    log "preserved runtime env before release prune: $app_root/.env"
  fi

  # PRE-EXTRACTION CLEANUP: drop old releases BEFORE we try to write the new
  # one. The post-extraction prune at the bottom of this function only fires
  # AFTER tar succeeds, so when the box is already at disk-pressure (this app
  # alone is ~1 GB/release × KEEP_RELEASES) the new tar errors out with
  # "No space left on device" and the deploy never lands. Pruning here keeps
  # the latest (KEEP_RELEASES - 1) so the incoming release becomes Nth.
  if [ "$KEEP_RELEASES" -gt 0 ] && [ -d "$releases" ]; then
    local pre_keep=$((KEEP_RELEASES - 1))
    [ "$pre_keep" -lt 0 ] && pre_keep=0
    local protected_current="" protected_previous="" pre_extra
    if [ -L "$app_root/current" ]; then
      protected_current="$(readlink -f "$app_root/current" 2>/dev/null || true)"
    fi
    if [ -f "$previous_marker" ]; then
      protected_previous="$(cat "$previous_marker" 2>/dev/null || true)"
    fi
    pre_extra=$(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
                  | while read -r mtime path; do
                      resolved="$(readlink -f "$path" 2>/dev/null || true)"
                      [ -n "$protected_current" ] && [ "$resolved" = "$protected_current" ] && continue
                      [ -n "$protected_previous" ] && [ "$resolved" = "$protected_previous" ] && continue
                      printf '%s %s\n' "$mtime" "$path"
                    done \
                  | sort -nr | tail -n +"$((pre_keep + 1))" | cut -d' ' -f2- || true)
    if [ -n "$pre_extra" ]; then
      log "pre-extract prune (keeping $pre_keep older releases):"
      echo "$pre_extra" | xargs -r rm -rf
    fi
  fi

  # Also reclaim any free space hiding in bundle staging from earlier failed runs.
  find "$BUNDLE_DIR" -maxdepth 1 -name 'nebutra-*.tar.gz' \
       ! -name "nebutra-${app}-${SHA}.tar.gz" -mmin +5 -delete 2>/dev/null || true

  mkdir -p "$release"
  log "extract $tarball -> $release"
  tar -xzf "$tarball" -C "$release"

  preserve_runtime_env "$app_root" "$release"
  local previous_current=""
  if [ -L "$app_root/current" ]; then
    previous_current="$(readlink -f "$app_root/current" 2>/dev/null || true)"
  fi
  if [ -n "$previous_current" ] && [ -d "$previous_current" ]; then
    printf '%s\n' "$previous_current" > "$previous_marker"
    log "$app rollback target -> $previous_current"
  fi
  ln -snf "$release" "$app_root/current"
  log "$app current -> $release"

  # API: keep a plain-node start.sh for manual restarts. Production packages
  # are prepared so Node can boot without the tsx emergency loader.
  if [ "$app" = "api" ]; then
    cat > "$app_root/start.sh" <<'STARTSH'
#!/bin/bash
set -a
[ -f /var/www/nebutra/api/.env ] && . /var/www/nebutra/api/.env
set +a
export NODE_ENV=production
export PORT="${PORT:-3002}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
cd /var/www/nebutra/api/current || exit 1
exec node dist/node.js
STARTSH
    chmod +x "$app_root/start.sh"
    log "api start.sh -> exec node dist/node.js"
  fi

  rm -f "$tarball"
  load_runtime_env "$app" "$release" "$pm2_name"

  # Decide between zero-downtime reload and force-recreate.
  #
  # `pm2 reload` keeps the existing in-memory config (cwd, script path, env)
  # and only reloads code from disk. That is fine for incremental deploys, but
  # it cannot pick up a NEW cwd or script path from ecosystem.config.cjs — for
  # that we have to delete and start fresh.
  #
  # Strategy: if the running process's cwd is already under our managed
  # release tree, do a zero-downtime reload. Otherwise (first-time migration,
  # or someone manually started it elsewhere), force-recreate from the
  # ecosystem so cwd/script match the new layout.
  local pm_cwd=""
  if pm2 describe "$pm2_name" >/dev/null 2>&1; then
    if command -v jq >/dev/null 2>&1; then
      pm_cwd=$(pm2 jlist 2>/dev/null \
                | jq -r ".[] | select(.name==\"$pm2_name\") | .pm2_env.pm_cwd // empty" \
                || echo "")
    elif command -v python3 >/dev/null 2>&1; then
      pm_cwd=$(pm2 jlist 2>/dev/null | python3 -c '
import json, sys
try:
    procs = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for p in procs:
    if p.get("name") == sys.argv[1]:
        print(p.get("pm2_env", {}).get("pm_cwd", ""))
        break
' "$pm2_name" 2>/dev/null || echo "")
    fi
  fi

  # `pm2 reload` is zero-downtime BUT keeps the resolved cwd from the
  # process's original start — it does NOT re-read the `current` symlink.
  # That's a problem because the pre-extract prune at the top of this
  # function can delete the old release directory that pm2 is still pointing
  # at. After symlink swap + reload, Node ends up trying to resolve modules
  # (e.g. `tsx`, `@nebutra/*` workspace deps) from a path that no longer
  # exists → ERR_MODULE_NOT_FOUND at startup.
  #
  # Only reload when ALL of these hold:
  #   1. pm2 was already running this process
  #   2. its cwd is under our managed app root
  #   3. that cwd directory still exists on disk
  #   4. it dereferences to the SAME path as the current `current` symlink
  #
  # Otherwise force-recreate so pm2 re-reads the ecosystem (which uses
  # `cwd: <app>/current`) and lands on the freshly-swapped release.
  local current_target=""
  if [ -L "$app_root/current" ]; then
    current_target="$(readlink -f "$app_root/current" 2>/dev/null || true)"
  fi
  local can_reload="no"
  if [ -n "$pm_cwd" ] && [[ "$pm_cwd" == "$app_root/"* ]] && [ -d "$pm_cwd" ]; then
    if [ -n "$current_target" ] && [ "$pm_cwd" = "$current_target" ]; then
      can_reload="yes"
    fi
  fi

  # Leave the tsx emergency launcher: if api-gateway still runs via tsx
  # (script path or node --import tsx), force-recreate from ecosystem.
  # start.sh itself is the supported launcher (sources .env then exec node).
  if [ "$pm2_name" = "api-gateway" ] && [ "$can_reload" = "yes" ]; then
    local pm_script="" pm_args=""
    if command -v jq >/dev/null 2>&1; then
      pm_script=$(pm2 jlist 2>/dev/null \
        | jq -r ".[] | select(.name==\"$pm2_name\") | .pm2_env.pm_exec_path // empty" \
        || echo "")
      pm_args=$(pm2 jlist 2>/dev/null \
        | jq -r ".[] | select(.name==\"$pm2_name\") | (.pm2_env.node_args // .pm2_env.interpreter_args // []) | if type==\"array\" then join(\" \") else . end" \
        || echo "")
    fi
    if [[ "$pm_script" == *tsx* ]] || [[ "$pm_args" == *tsx* ]]; then
      log "api-gateway still on legacy tsx launcher ($pm_script $pm_args) — force-recreating with plain node"
      can_reload="no"
    fi
  fi

  if [ "$can_reload" = "yes" ]; then
    log "reload pm2 $pm2_name (cwd=$pm_cwd, zero-downtime)"
    pm2 reload "$pm2_name" --update-env
  else
    if [ -n "$pm_cwd" ]; then
      if [ ! -d "$pm_cwd" ]; then
        log "pm2 $pm2_name cwd=$pm_cwd no longer exists (prior release pruned) — force-recreating"
      elif [ "$pm_cwd" != "$current_target" ]; then
        log "pm2 $pm2_name cwd=$pm_cwd does not match current → $current_target — force-recreating"
      else
        log "pm2 $pm2_name has cwd=$pm_cwd, not under $app_root — force-recreating"
      fi
    else
      log "pm2 process $pm2_name not registered — starting from ecosystem"
    fi
    pm2 delete "$pm2_name" >/dev/null 2>&1 || true
    pm2 start "$PM2_CONFIG" --only "$pm2_name"
  fi

  # Surface PM2 status + recent logs so CI can see crash reasons. Without
  # this, deploys that succeed at the SSH level but crash at startup return
  # exit 0 here and only fail later in the workflow's HTTP smoke test —
  # without any clue why.
  log "pm2 status for $pm2_name (post start/reload):"
  pm2 list --no-color 2>&1 | grep -E "$pm2_name|App name" || true
  log "pm2 logs for $pm2_name (last 40 lines, no stream):"
  pm2 logs "$pm2_name" --nostream --lines 40 --raw --no-color 2>&1 | tail -50 || true

  case "$pm2_name" in
    api-gateway)
      wait_for_local_http "api-gateway" "$pm2_name" "http://127.0.0.1:3002/api/misc/health" "^200$"
      ;;
    landing)
      wait_for_local_http "landing" "$pm2_name" "http://127.0.0.1:3001/get-license"
      ;;
    web)
      wait_for_local_http "web" "$pm2_name" "http://127.0.0.1:3000/"
      ;;
    idp)
      wait_for_local_http "idp" "$pm2_name" "http://127.0.0.1:3100/health" "^200$"
      ;;
    auth-center|auth)
      wait_for_local_http "auth-center" "$pm2_name" "http://127.0.0.1:3101/health" "^200$"
      ;;
    design-docs)
      wait_for_local_http "design-docs" "$pm2_name" "http://127.0.0.1:3004/"
      ;;
    sailor-docs)
      wait_for_local_http "sailor-docs" "$pm2_name" "http://127.0.0.1:3005/"
      ;;
    router)
      wait_for_local_http "router" "$pm2_name" "http://127.0.0.1:3106/"
      ;;
    forge)
      wait_for_local_http "forge" "$pm2_name" "http://127.0.0.1:3105/"
      ;;
  esac

  # Retention — keep latest N, drop the rest. find sorts by mtime via -printf
  # to avoid SC2012 issues with `ls`. Release names are timestamped so this is
  # equivalent to lexical sort.
  if [ "$KEEP_RELEASES" -gt 0 ]; then
    local previous_target="" extra
    if [ -f "$previous_marker" ]; then
      previous_target="$(cat "$previous_marker" 2>/dev/null || true)"
    fi
    extra=$(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
              | while read -r mtime path; do
                  resolved="$(readlink -f "$path" 2>/dev/null || true)"
                  [ -n "$current_target" ] && [ "$resolved" = "$current_target" ] && continue
                  [ -n "$previous_target" ] && [ "$resolved" = "$previous_target" ] && continue
                  printf '%s %s\n' "$mtime" "$path"
                done \
              | sort -nr | tail -n +"$((KEEP_RELEASES + 1))" | cut -d' ' -f2- || true)
    if [ -n "$extra" ]; then
      log "pruning old releases:"
      echo "$extra" | xargs -r rm -rf
    fi
  fi
}

pm2_name_for_app() {
  case "$1" in
    landing)      printf '%s\n' "landing" ;;
    web)          printf '%s\n' "web" ;;
    api)          printf '%s\n' "api-gateway" ;;
    idp)          printf '%s\n' "idp" ;;
    auth)         printf '%s\n' "auth-center" ;;
    design-docs)  printf '%s\n' "design-docs" ;;
    sailor-docs)  printf '%s\n' "sailor-docs" ;;
    router)       printf '%s\n' "router" ;;
    forge)        printf '%s\n' "forge" ;;
    *)            fail "unknown app: $1" ;;
  esac
}

rollback_one() {
  local app="$1" pm2_name="$2"
  local app_root="$DEPLOY_ROOT/$app"
  local previous_marker="$app_root/.previous"

  if [ ! -f "$previous_marker" ]; then
    log "rollback skip $app — no previous release marker at $previous_marker"
    return 0
  fi

  local previous current_target
  previous="$(cat "$previous_marker" 2>/dev/null || true)"
  if [ -z "$previous" ] || [ ! -d "$previous" ]; then
    log "rollback skip $app — previous release missing: ${previous:-<empty>}"
    return 0
  fi

  current_target="$(readlink -f "$app_root/current" 2>/dev/null || true)"
  if [ "$current_target" = "$previous" ]; then
    log "rollback skip $app — already on previous release $previous"
    return 0
  fi

  ln -snf "$previous" "$app_root/current"
  log "rollback $app current -> $previous"
  pm2 delete "$pm2_name" >/dev/null 2>&1 || true
  pm2 start "$PM2_CONFIG" --only "$pm2_name"

  if [ "$pm2_name" = "api-gateway" ]; then
    local code="000"
    for attempt in 1 2 3 4 5; do
      code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 \
        "http://127.0.0.1:3002/api/misc/health" 2>/dev/null || echo "000")
      [ "$code" = "200" ] && break
      sleep 6
    done
    [ "$code" = "200" ] || fail "rollback api-gateway failed local health check (last code: $code)"
  fi
}

nginx_worker_user() {
  local current_user=""
  if [ -f /etc/nginx/nginx.conf ]; then
    current_user="$(awk '/^user[[:space:]]+/ { gsub(";", "", $2); print $2; exit }' /etc/nginx/nginx.conf 2>/dev/null || true)"
  fi

  if [ -n "$current_user" ] && id "$current_user" >/dev/null 2>&1; then
    printf '%s\n' "$current_user"
    return 0
  fi
  if id nginx >/dev/null 2>&1; then
    printf '%s\n' "nginx"
    return 0
  fi
  if id www-data >/dev/null 2>&1; then
    printf '%s\n' "www-data"
    return 0
  fi

  printf '%s\n' ""
}

restore_nginx_config() {
  local backup_dir="$1"

  if [ -f "$backup_dir/nginx.conf" ]; then
    cp -p "$backup_dir/nginx.conf" /etc/nginx/nginx.conf
  fi
  if [ -f "$backup_dir/proxy_params.conf" ]; then
    cp -p "$backup_dir/proxy_params.conf" /etc/nginx/conf.d/proxy_params.conf
  fi
  if [ -f "$backup_dir/security.conf" ]; then
    cp -p "$backup_dir/security.conf" /etc/nginx/conf.d/security.conf
  fi
  if [ -f "$backup_dir/forge.nebutra.com.conf" ]; then
    cp -p "$backup_dir/forge.nebutra.com.conf" /etc/nginx/conf.d/forge.nebutra.com.conf
  fi
  if [ -f "$backup_dir/router.nebutra.com.conf" ]; then
    cp -p "$backup_dir/router.nebutra.com.conf" /etc/nginx/conf.d/router.nebutra.com.conf
  fi
  if [ -f "$backup_dir/docs.nebutra.com.conf" ]; then
    cp -p "$backup_dir/docs.nebutra.com.conf" /etc/nginx/conf.d/docs.nebutra.com.conf
  fi
}

dump_nginx_web_diagnostics() {
  log "nginx app.nebutra.com diagnostics:"
  nginx -T 2>/dev/null \
    | awk '
      /upstream nebutra_web/ { show=1; depth=0 }
      /server_name app\.nebutra\.com/ { show=1; depth=0 }
      show {
        print
        depth += gsub(/\{/, "{")
        depth -= gsub(/\}/, "}")
        if (depth <= 0 && /}/) {
          print ""
          show=0
        }
      }
    ' \
    | tail -120 || true
  log "nginx error log tail:"
  tail -80 /var/log/nginx/error.log 2>/dev/null || true
}

sync_nginx_runtime_config() {
  local nginx_main="/tmp/nebutra-nginx.conf"
  local nginx_proxy="/tmp/nebutra-nginx-proxy_params.conf"
  local nginx_security="/tmp/nebutra-nginx-security.conf"
  local nginx_forge="/tmp/nebutra-nginx-forge.conf"
  local nginx_router="/tmp/nebutra-nginx-router.conf"
  local nginx_docs="/tmp/nebutra-nginx-docs.conf"

  if ! command -v nginx >/dev/null 2>&1; then
    log "nginx not installed; skipping nginx config sync"
    return 0
  fi
  if [ ! -f "$nginx_main" ]; then
    log "nginx config artifact not uploaded; skipping nginx config sync"
    return 0
  fi

  local backup_dir="/etc/nginx/nebutra-backups/$(date -u +%Y%m%d-%H%M%S)-${SHA:0:7}"
  mkdir -p "$backup_dir" /etc/nginx/conf.d
  [ -f /etc/nginx/nginx.conf ] && cp -p /etc/nginx/nginx.conf "$backup_dir/nginx.conf" || true
  [ -f /etc/nginx/conf.d/proxy_params.conf ] && cp -p /etc/nginx/conf.d/proxy_params.conf "$backup_dir/proxy_params.conf" || true
  [ -f /etc/nginx/conf.d/security.conf ] && cp -p /etc/nginx/conf.d/security.conf "$backup_dir/security.conf" || true
  [ -f /etc/nginx/conf.d/forge.nebutra.com.conf ] && cp -p /etc/nginx/conf.d/forge.nebutra.com.conf "$backup_dir/forge.nebutra.com.conf" || true
  [ -f /etc/nginx/conf.d/router.nebutra.com.conf ] && cp -p /etc/nginx/conf.d/router.nebutra.com.conf "$backup_dir/router.nebutra.com.conf" || true
  [ -f /etc/nginx/conf.d/docs.nebutra.com.conf ] && cp -p /etc/nginx/conf.d/docs.nebutra.com.conf "$backup_dir/docs.nebutra.com.conf" || true

  local rendered_main worker_user
  rendered_main="$(mktemp)"
  worker_user="$(nginx_worker_user)"
  if [ -n "$worker_user" ]; then
    sed -E "s/^user[[:space:]]+[^;]+;/user ${worker_user};/" "$nginx_main" > "$rendered_main"
  else
    cp "$nginx_main" "$rendered_main"
  fi

  # Ensure product vhosts are always loaded even if an older nginx.conf artifact
  # lacked the include (historical footgun: PM2 healthy, host → 301 to apex).
  inject_vhost_include() {
    local conf_name="$1"
    local comment="$2"
    if grep -q "conf.d/${conf_name}" "$rendered_main"; then
      return 0
    fi
    awk -v conf="$conf_name" -v comment="$comment" '
      { lines[NR] = $0 }
      END {
        last = NR
        for (i = 1; i <= last; i++) {
          if (i == last && lines[i] ~ /^}/) {
            print "    # " comment
            print "    include /etc/nginx/conf.d/" conf ";"
          }
          print lines[i]
        }
      }
    ' "$rendered_main" > "${rendered_main}.with-vhost"
    mv "${rendered_main}.with-vhost" "$rendered_main"
    log "injected ${conf_name} include into nginx.conf"
  }
  inject_vhost_include "forge.nebutra.com.conf" "Nebutra Forge tool station (PM2 :3105)"
  inject_vhost_include "router.nebutra.com.conf" "Nebutra Router product edge (PM2 :3106)"
  inject_vhost_include "docs.nebutra.com.conf" "Nebutra Sailor Docs (PM2 :3005)"

  install -m 0644 "$rendered_main" /etc/nginx/nginx.conf
  rm -f "$rendered_main"
  [ -f "$nginx_proxy" ] && install -m 0644 "$nginx_proxy" /etc/nginx/conf.d/proxy_params.conf
  [ -f "$nginx_security" ] && install -m 0644 "$nginx_security" /etc/nginx/conf.d/security.conf
  if [ -f "$nginx_forge" ]; then
    install -m 0644 "$nginx_forge" /etc/nginx/conf.d/forge.nebutra.com.conf
    log "installed forge.nebutra.com.conf"
  else
    log "forge nginx fragment not uploaded; keeping existing conf.d/forge.nebutra.com.conf if present"
  fi
  if [ -f "$nginx_router" ]; then
    install -m 0644 "$nginx_router" /etc/nginx/conf.d/router.nebutra.com.conf
    log "installed router.nebutra.com.conf"
  else
    log "router nginx fragment not uploaded; keeping existing conf.d/router.nebutra.com.conf if present"
  fi
  if [ -f "$nginx_docs" ]; then
    install -m 0644 "$nginx_docs" /etc/nginx/conf.d/docs.nebutra.com.conf
    log "installed docs.nebutra.com.conf"
  else
    log "docs nginx fragment not uploaded; keeping existing conf.d/docs.nebutra.com.conf if present"
  fi

  if ! nginx -t; then
    log "nginx config test failed; restoring previous config from $backup_dir"
    restore_nginx_config "$backup_dir"
    nginx -t || true
    fail "nginx config sync failed"
  fi

  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
    systemctl reload nginx
  else
    nginx -s reload
  fi
  log "nginx config synced from deploy artifacts (incl. forge + router vhosts)"
}

verify_nginx_web_origin() {
  case " $APPS " in
    *" web "*) : ;;
    *) return 0 ;;
  esac

  command -v nginx >/dev/null 2>&1 || return 0

  local code="000"
  for attempt in 1 2 3 4 5; do
    code=$(curl -ksS -o /dev/null -w "%{http_code}" --max-time 10 \
      --resolve app.nebutra.com:443:127.0.0.1 \
      https://app.nebutra.com/ 2>/dev/null || echo "000")
    case "$code" in
      200|301|302|307) break ;;
      *) sleep 4 ;;
    esac
  done

  case "$code" in
    200|301|302|307)
      log "nginx local web origin -> $code"
      ;;
    *)
      dump_nginx_web_diagnostics
      fail "nginx local web origin failed for app.nebutra.com (last code: $code)"
      ;;
  esac
}

run_selected_apps() {
  local action="$1" app pm2_name
  for app in api landing web idp auth design-docs sailor-docs router forge; do
    case " $APPS " in
      *" $app "*) : ;;
      *) continue ;;
    esac
    pm2_name="$(pm2_name_for_app "$app")"
    "$action" "$app" "$pm2_name"
  done
}

if [ "$MODE" = "rollback" ]; then
  log "rollback requested: $APPS @ $SHA"
  run_selected_apps rollback_one
  pm2 save
  log "rollback complete: $APPS"
  exit 0
fi

for app in api landing web idp auth design-docs sailor-docs router forge; do
  case " $APPS " in
    *" $app "*) : ;;
    *) continue ;;
  esac

  case "$app" in
    landing)      deploy_one landing     landing ;;
    web)          deploy_one web         web          ;;
    api)          deploy_one api         api-gateway  ;;
    idp)          deploy_one idp         idp          ;;
    auth)         deploy_one auth        auth-center  ;;
    design-docs)  deploy_one design-docs design-docs  ;;
    sailor-docs)  deploy_one sailor-docs sailor-docs  ;;
    router)       deploy_one router      router       ;;
    forge)        deploy_one forge       forge        ;;
    *)            fail "unknown app: $app"            ;;
  esac
done

sync_nginx_runtime_config
verify_nginx_web_origin
pm2 save
log "deploy complete: $APPS @ $SHA"
