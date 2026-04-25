#!/bin/bash
# Vercel "Ignored Build Step" script for monorepo apps.
#
# Usage from an app-level vercel.json:
#   bash ../../scripts/vercel-ignore-build.sh apps/web
#   bash ../../scripts/vercel-ignore-build.sh apps/api-gateway
#   bash ../../scripts/vercel-ignore-build.sh apps/landing-page
#   bash ../../scripts/vercel-ignore-build.sh apps/studio
#   bash ../../scripts/vercel-ignore-build.sh apps/tsekaluk-dev
#
# Vercel exit code contract:
#   exit 0 → skip build
#   exit 1 → proceed with build
#
# Vercel env vars used:
#   VERCEL_GIT_PREVIOUS_SHA         — last successful deployment SHA for the project/branch
#   VERCEL_GIT_COMMIT_REF           — branch name
#   VERCEL_GIT_COMMIT_AUTHOR_LOGIN  — git author username

set -euo pipefail

APP_DIR="${1:?Usage: $0 <app-dir>  e.g. apps/web}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
COMMIT_REF="${VERCEL_GIT_COMMIT_REF:-}"
AUTHOR_LOGIN="${VERCEL_GIT_COMMIT_AUTHOR_LOGIN:-}"

echo "Repo root: $REPO_ROOT"
echo "Checking for changes in: $APP_DIR, packages/, and shared workspace config"

# Dependabot preview deployments are low-signal and expensive in this repo.
# Skip immediately before any diff logic so first-time branches are skipped too.
if [[ "$COMMIT_REF" == dependabot/* ]] || [[ "$AUTHOR_LOGIN" == "dependabot[bot]" ]]; then
  echo "Dependabot-triggered deployment detected for ref '$COMMIT_REF' by '$AUTHOR_LOGIN'"
  echo "→ Skipping build."
  exit 0
fi

# This repo is maintained from main only. Preview branch deployments are
# intentionally skipped so Vercel does not spend 45 minutes building stale
# integration branches.
if [[ -n "$COMMIT_REF" && "$COMMIT_REF" != "main" ]]; then
  echo "Non-main deployment detected for ref '$COMMIT_REF'"
  echo "→ Skipping build; only main is deployed."
  exit 0
fi

# If Vercel has no previous deployment SHA, always build for non-Dependabot refs.
if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  echo "No previous deployment found — building."
  exit 1
fi

# Fetch enough history to compare with the previous deployed commit.
git -C "$REPO_ROOT" fetch origin --depth=50 2>/dev/null || true

# Check if anything in this app, shared packages, or root workspace config changed.
# If Vercel's shallow clone cannot resolve the previous deployment SHA, default
# to building. A false positive build is cheaper than accidentally skipping main.
if ! DIFF_FILES=$(git -C "$REPO_ROOT" diff "$VERCEL_GIT_PREVIOUS_SHA" HEAD --name-only 2>/dev/null); then
  echo "Could not compare against $VERCEL_GIT_PREVIOUS_SHA - building to avoid a false skip."
  exit 1
fi

CHANGED=$(
  echo "$DIFF_FILES" \
    | grep -E "^${APP_DIR}/|^packages/|^scripts/|^(package.json|pnpm-lock.yaml|pnpm-workspace.yaml|turbo.json|tsconfig.base.json|vercel.json|biome.json|lefthook.yml)$" \
    || true
)

if [ -n "$CHANGED" ]; then
  echo "Changes detected:"
  echo "$CHANGED"
  echo "→ Building."
  exit 1
fi

echo "No relevant changes since $VERCEL_GIT_PREVIOUS_SHA"
echo "→ Skipping build."
exit 0
