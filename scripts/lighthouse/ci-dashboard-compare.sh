#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/lighthouse/ci-dashboard-compare.sh \
    --before-ref <git-ref> \
    [--after-ref <git-ref>] \
    [--runs <count>] \
    [--target-path <path>] \
    [--output-dir <dir>] \
    [--container-image <image>] \
    [--port <port>] \
    [--store-dir <dir>] \
    [--keep-worktrees]

Defaults:
  --after-ref       HEAD
  --runs            3
  --target-path     /tenants
  --port            3101
  --container-image mcr.microsoft.com/playwright:v1.58.2-jammy
  --store-dir       /tmp/nebutra-lh-pnpm-store
  --output-dir      artifacts/lighthouse-ci/<timestamp>-dashboard-ci
USAGE
}

ROOT="$(git rev-parse --show-toplevel)"
BEFORE_REF=""
AFTER_REF="HEAD"
RUNS=3
TARGET_PATH="/tenants"
PORT=3101
CONTAINER_IMAGE="mcr.microsoft.com/playwright:v1.58.2-jammy"
STORE_DIR="/tmp/nebutra-lh-pnpm-store"
OUTPUT_DIR=""
KEEP_WORKTREES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --before-ref)
      BEFORE_REF="$2"
      shift 2
      ;;
    --after-ref)
      AFTER_REF="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --target-path)
      TARGET_PATH="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --container-image)
      CONTAINER_IMAGE="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --store-dir)
      STORE_DIR="$2"
      shift 2
      ;;
    --keep-worktrees)
      KEEP_WORKTREES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BEFORE_REF" ]]; then
  echo "--before-ref is required" >&2
  usage
  exit 1
fi

if ! [[ "$RUNS" =~ ^[1-9][0-9]*$ ]]; then
  echo "--runs must be a positive integer" >&2
  exit 1
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$ROOT/artifacts/lighthouse-ci/$(date +%Y-%m-%d-%H%M%S)-dashboard-ci"
elif [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$ROOT/$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR" "$STORE_DIR"

WORKTREE_ROOT="$(mktemp -d /tmp/nebutra-lh-worktrees-XXXXXX)"
BEFORE_DIR="$WORKTREE_ROOT/before"
AFTER_DIR="$WORKTREE_ROOT/after"

cleanup() {
  if [[ "$KEEP_WORKTREES" -eq 1 ]]; then
    return
  fi

  if [[ -d "$BEFORE_DIR/.git" || -f "$BEFORE_DIR/.git" ]]; then
    git -C "$ROOT" worktree remove --force "$BEFORE_DIR" >/dev/null 2>&1 || true
  fi

  if [[ -d "$AFTER_DIR/.git" || -f "$AFTER_DIR/.git" ]]; then
    git -C "$ROOT" worktree remove --force "$AFTER_DIR" >/dev/null 2>&1 || true
  fi

  rm -rf "$WORKTREE_ROOT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Preparing worktrees..."
HUSKY=0 git -C "$ROOT" worktree add --detach "$BEFORE_DIR" "$BEFORE_REF" >/dev/null
HUSKY=0 git -C "$ROOT" worktree add --detach "$AFTER_DIR" "$AFTER_REF" >/dev/null

ensure_public_target_route() {
  local snapshot_dir="$1"
  local middleware_file="$snapshot_dir/apps/web/src/middleware.ts"

  if [[ ! -f "$middleware_file" ]]; then
    return
  fi

  if grep -q '"/tenants(.*)"' "$middleware_file"; then
    return
  fi

  if [[ "$TARGET_PATH" == "/tenants" ]]; then
    local tmp_file
    tmp_file="$(mktemp)"
    awk '
      {
        print $0
        if ($0 ~ /"\/demo\(\.\*\)",/) {
          print "  \"/tenants(.*)\",";
        }
      }
    ' "$middleware_file" > "$tmp_file"
    mv "$tmp_file" "$middleware_file"
  fi
}

run_snapshot_once() {
  local label="$1"
  local snapshot_dir="$2"
  local run_index="$3"
  local output_json="dashboard-tenants-${label}.mobile.r${run_index}.json"

  echo "Running ${label} snapshot (run ${run_index}/${RUNS})..."

  ensure_public_target_route "$snapshot_dir"

  docker run --rm \
    -v "$snapshot_dir:/workspace" \
    -v "$OUTPUT_DIR:/out" \
    -v "$STORE_DIR:/pnpm-store" \
    -w /workspace \
    "$CONTAINER_IMAGE" \
    bash -lc "
      set -euo pipefail
      corepack enable
      corepack prepare pnpm@10.14.0 --activate
      pnpm config set store-dir /pnpm-store
      export CI=1
      export SKIP_ENV_VALIDATION=true
      export NEBUTRA_SKIP_GIT_HOOKS=1
      export DATABASE_URL='postgresql://lighthouse:lighthouse@localhost:5432/lighthouse'

      rm -f apps/web/.env.local

      pnpm install --frozen-lockfile --prefer-offline || pnpm install --no-frozen-lockfile --prefer-offline
      pnpm turbo run build --filter=@nebutra/web^...
      pnpm --filter @nebutra/brand sync

      cd apps/web
      pnpm exec next build
      pnpm exec next start -p ${PORT} >/tmp/next.log 2>&1 &
      APP_PID=\$!
      trap 'kill \$APP_PID >/dev/null 2>&1 || true' EXIT

      READY=0
      for i in \$(seq 1 120); do
        if curl -fsS -o /dev/null 'http://127.0.0.1:${PORT}${TARGET_PATH}'; then
          READY=1
          break
        fi
        sleep 1
      done

      if [[ "\$READY" -ne 1 ]]; then
        echo 'Next.js app did not become healthy before Lighthouse.' >&2
        cat /tmp/next.log >&2 || true
        exit 1
      fi

      CHROME_PATH=\$(ls /ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -n 1 || true)
      if [[ -z "\$CHROME_PATH" ]]; then
        CHROME_PATH=\$(ls /ms-playwright/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -n 1 || true)
      fi
      if [[ -z "\$CHROME_PATH" ]]; then
        CHROME_PATH=\$(find /ms-playwright -type f -name chrome 2>/dev/null | head -n 1 || true)
      fi
      if [[ -z "\$CHROME_PATH" ]]; then
        CHROME_PATH=\$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)
      fi
      echo Chrome path candidate: \$CHROME_PATH
      if [[ -z "\$CHROME_PATH" ]]; then
        echo Unable to resolve CHROME_PATH for Lighthouse. >&2
        exit 1
      fi
      export CHROME_PATH
      echo Using CHROME_PATH=\$CHROME_PATH

      pnpm dlx lighthouse 'http://127.0.0.1:${PORT}${TARGET_PATH}' \
        --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
        --output=json \
        --output-path='/out/${output_json}' \
        --only-categories=performance,accessibility,best-practices,seo \
        --form-factor=mobile \
        --screenEmulation.mobile=true \
        --screenEmulation.width=390 \
        --screenEmulation.height=844 \
        --screenEmulation.deviceScaleFactor=2.625 \
        --throttling-method=simulate \
        --throttling.cpuSlowdownMultiplier=4 \
        --throttling.requestLatencyMs=150 \
        --throttling.downloadThroughputKbps=1638.4 \
        --throttling.uploadThroughputKbps=675 \
        --quiet

      kill \$APP_PID >/dev/null 2>&1 || true
      wait \$APP_PID 2>/dev/null || true
    "
}

for run in $(seq 1 "$RUNS"); do
  run_snapshot_once "before" "$BEFORE_DIR" "$run"
  run_snapshot_once "after" "$AFTER_DIR" "$run"
done

node "$ROOT/scripts/lighthouse/generate-compare-report.mjs" \
  --output-dir "$OUTPUT_DIR" \
  --before-prefix "dashboard-tenants-before.mobile" \
  --after-prefix "dashboard-tenants-after.mobile" \
  --runs "$RUNS" \
  --target-path "$TARGET_PATH" \
  --container-image "$CONTAINER_IMAGE" \
  --port "$PORT"

echo "Lighthouse report generated: $OUTPUT_DIR/dashboard-tenants-compare.md"
