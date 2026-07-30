#!/bin/bash
# Vercel "Ignored Build Step" for monorepo apps — build only when that app's
# *scope* changed (app dir + direct workspace deps + shared workspace roots).
#
# Usage from an app-level vercel.json:
#   bash ../../scripts/vercel-ignore-build.sh apps/sailor-docs
#   bash ../../scripts/vercel-ignore-build.sh apps/web
#
# Exit codes (Vercel contract):
#   0 → skip build
#   1 → proceed with build
#
# Env (Vercel provides most):
#   VERCEL_GIT_PREVIOUS_SHA, VERCEL_GIT_COMMIT_REF, VERCEL_GIT_COMMIT_AUTHOR_LOGIN
#   VERCEL_FORCE_BUILD=1          — always build this project
#   VERCEL_ALLOW_ECS_OPTIONAL=1   — allow ECS-primary apps to build when in scope
#
# Commit message overrides:
#   [vercel-force]                — build even if scope empty
#   [vercel:apps/web]             — allow that ECS-optional app to build this push
#
# Why not match all of packages/?
#   The old rule rebuilt every Vercel project on any package change and burned
#   Hobby's ~100 deployments/day. Scope is intentional and per-app.
#
# Hobby note: canceled/skipped deploys can still count toward the daily cap.
# Keep Git connected only for surfaces you want auto-deployed (typically
# landing + sailor-docs). web/auth/api production is ECS — optional on Vercel.

set -euo pipefail

APP_DIR="${1:?Usage: $0 <app-dir>  e.g. apps/web}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
COMMIT_REF="${VERCEL_GIT_COMMIT_REF:-}"
AUTHOR_LOGIN="${VERCEL_GIT_COMMIT_AUTHOR_LOGIN:-}"
COMMIT_MSG="$(git -C "$REPO_ROOT" log -1 --pretty=%B 2>/dev/null || true)"

echo "Repo root: $REPO_ROOT"
echo "App scope root: $APP_DIR"

if [ ! -d "$REPO_ROOT/$APP_DIR" ]; then
  echo "Unknown Vercel app directory: $APP_DIR"
  echo "→ Building to avoid a false skip."
  exit 1
fi

# --- Always-skip noise ---
if [[ "$COMMIT_REF" == dependabot/* ]] || [[ "$AUTHOR_LOGIN" == "dependabot[bot]" ]]; then
  echo "Dependabot deployment — skip."
  exit 0
fi

if [[ -n "$COMMIT_REF" && "$COMMIT_REF" != "main" ]]; then
  echo "Non-main ref '$COMMIT_REF' — skip (main only)."
  exit 0
fi

if [[ "${VERCEL_FORCE_BUILD:-}" == "1" ]] || [[ "$COMMIT_MSG" == *"[vercel-force]"* ]]; then
  echo "Force build requested — building."
  exit 1
fi

# --- ECS-primary surfaces: production is not Vercel; skip unless opted in ---
# Opt-in: VERCEL_ALLOW_ECS_OPTIONAL=1 on the Vercel project, or commit tag.
is_ecs_optional=0
case "$APP_DIR" in
  apps/web|apps/auth|backends/gateway) is_ecs_optional=1 ;;
esac

if [[ "$is_ecs_optional" -eq 1 ]]; then
  tag="[vercel:${APP_DIR}]"
  if [[ "${VERCEL_ALLOW_ECS_OPTIONAL:-}" != "1" && "$COMMIT_MSG" != *"$tag"* && "$COMMIT_MSG" != *"[vercel:ecs-optional]"* ]]; then
    echo "ECS-primary app ($APP_DIR) — skip Vercel auto-deploy."
    echo "  Opt in: set VERCEL_ALLOW_ECS_OPTIONAL=1 on the project, or commit with $tag"
    exit 0
  fi
  echo "ECS-optional app allowed for this push."
fi

# --- Per-app path scopes (app + direct @nebutra workspace packages) ---
# Paths are prefixes matched against git diff --name-only.
# Keep this list in sync when adding workspace deps to an app package.json.
# Root files that can break any workspace app when changed.
# Intentionally exclude root package.json and pnpm-lock.yaml — those change
# often without affecting a given app's runtime graph (lockfile is handled
# separately only when paired with in-scope path hits).
shared_roots=(
  "pnpm-workspace.yaml"
  "turbo.json"
  "tsconfig.base.json"
  "catalog"
)

# Root pnpm-lock.yaml: only treated as in-scope if the app dir itself or one of
# its package paths also changed (handled after we collect app_paths).

scope_paths_for() {
  case "$1" in
    apps/sailor-docs)
      cat <<'EOF'
apps/sailor-docs
packages/design/brand
packages/design/icons
packages/design/tokens
packages/design/ui
packages/design/design-tokens
EOF
      ;;
    apps/landing)
      cat <<'EOF'
apps/landing
packages/ai/ai-providers
packages/iam/auth
packages/commerce/billing
packages/commerce/blog
packages/design/brand
packages/platform/db
packages/platform/i18n
packages/design/icons
packages/commerce/license
packages/platform/logger
packages/commerce/marketing
packages/ops/sanity
packages/design/tokens
packages/design/ui
packages/commerce/waitlist
packages/design/design-tokens
EOF
      ;;
    apps/design-docs)
      cat <<'EOF'
apps/design-docs
packages/design/brand
packages/design/icons
packages/design/tokens
packages/design/ui
packages/design/design-tokens
EOF
      ;;
    apps/studio)
      cat <<'EOF'
apps/studio
packages/ops/sanity
EOF
      ;;
    apps/auth)
      cat <<'EOF'
apps/auth
packages/iam/auth
packages/iam/captcha
packages/design/brand
packages/platform/db
packages/platform/i18n
packages/design/icons
packages/platform/logger
packages/design/tokens
packages/design/ui
packages/design/design-tokens
EOF
      ;;
    apps/router)
      cat <<'EOF'
apps/router
packages/ai/ai-providers
packages/design/brand
packages/design/icons
packages/design/tokens
packages/design/ui
packages/design/design-tokens
packages/iam/auth
packages/platform/prepaid-wallet
packages/platform/router-supply
EOF
      ;;
    apps/forge)
      cat <<'EOF'
apps/forge
packages/ai/forge-runtime
packages/design/brand
packages/design/icons
packages/design/tokens
packages/design/ui
packages/design/design-tokens
packages/iam/auth
packages/platform/prepaid-wallet
EOF
      ;;
    apps/typelens)
      cat <<'EOF'
apps/typelens
packages/design/typelens-catalog
packages/design/brand
packages/design/icons
packages/design/tokens
packages/design/ui
packages/design/design-tokens
EOF
      ;;
    apps/web)
      # Broad product app — still narrower than entire packages/
      cat <<'EOF'
apps/web
packages/commerce
packages/design
packages/iam
packages/platform
packages/ai/agents
packages/ai/agent-runtime
packages/ai/startup-os
packages/ops/preset
packages/ops/sanity
EOF
      ;;
    backends/gateway)
      cat <<'EOF'
backends/gateway
packages/ai
packages/commerce
packages/iam
packages/platform
packages/integrations
EOF
      ;;
    *)
      # Unknown app: only its own directory + shared roots (safe default).
      echo "$1"
      ;;
  esac
}

# Portable array fill. No mapfile (macOS bash 3.x) and NO process substitution:
# Vercel's build shell has no /dev/fd, so `done < <(...)` fails with
# "/dev/fd/63: No such file or directory" and leaves this array EMPTY.
#
# That failure was silent and it inverted the script's purpose. With no scope
# paths, path_in_scope() below matches only shared_roots — so a commit touching
# nothing but apps/<name>/src produced zero SCOPE_HITS and the build was SKIPPED.
# A false skip is the one outcome every other branch in this file goes out of its
# way to avoid, and it is why an app-only change could deploy as a no-op.
#
# A here-string is the portable form and this same file already uses it further
# down, on DIFF_FILES. It writes a temp file rather than a /dev/fd entry.
APP_SCOPE_PATHS=()
_scope_out="$(scope_paths_for "$APP_DIR")"
while IFS= read -r _scope_line; do
  [ -n "$_scope_line" ] && APP_SCOPE_PATHS+=("$_scope_line")
done <<< "$_scope_out"

if [ ${#APP_SCOPE_PATHS[@]} -eq 0 ]; then
  echo "scope_paths_for produced nothing for $APP_DIR — building rather than risk a false skip."
  exit 1
fi

echo "Scope paths:"
for _p in "${APP_SCOPE_PATHS[@]}" "${shared_roots[@]}"; do
  echo "  - $_p"
done

# --- Diff against last successful deployment ---
if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  echo "No previous deployment SHA — building."
  exit 1
fi

git -C "$REPO_ROOT" fetch --no-tags --depth=1 origin "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null ||
  git -C "$REPO_ROOT" fetch --no-tags --depth=50 origin 2>/dev/null ||
  true

if ! DIFF_FILES=$(git -C "$REPO_ROOT" diff "$VERCEL_GIT_PREVIOUS_SHA" HEAD --name-only 2>/dev/null); then
  echo "Could not diff against $VERCEL_GIT_PREVIOUS_SHA — building to avoid false skip."
  exit 1
fi

if [ -z "$DIFF_FILES" ]; then
  echo "Empty diff — skip."
  exit 0
fi

path_in_scope() {
  local file="$1"
  local p
  for p in "${APP_SCOPE_PATHS[@]}"; do
    if [[ "$file" == "$p" || "$file" == "$p"/* ]]; then
      return 0
    fi
  done
  for p in "${shared_roots[@]}"; do
    if [[ "$file" == "$p" || "$file" == "$p"/* ]]; then
      return 0
    fi
  done
  return 1
}

# First pass: scope hits excluding lockfile-only
SCOPE_HITS=()
LOCKFILE_TOUCHED=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if [[ "$file" == "pnpm-lock.yaml" ]]; then
    LOCKFILE_TOUCHED=1
    continue
  fi
  if path_in_scope "$file"; then
    SCOPE_HITS+=("$file")
  fi
done <<< "$DIFF_FILES"

# Lockfile alone does not rebuild every app — only if something in this app's
# scope also moved (or app package.json / workspace deps).
if [[ "$LOCKFILE_TOUCHED" -eq 1 && ${#SCOPE_HITS[@]} -gt 0 ]]; then
  SCOPE_HITS+=("pnpm-lock.yaml")
elif [[ "$LOCKFILE_TOUCHED" -eq 1 ]]; then
  echo "pnpm-lock.yaml changed but no paths in $APP_DIR scope — skip."
fi

if [[ ${#SCOPE_HITS[@]} -gt 0 ]]; then
  echo "In-scope changes since $VERCEL_GIT_PREVIOUS_SHA:"
  printf '  %s\n' "${SCOPE_HITS[@]}"
  echo "→ Building."
  exit 1
fi

echo "No in-scope changes for $APP_DIR since $VERCEL_GIT_PREVIOUS_SHA"
echo "→ Skipping build."
exit 0
