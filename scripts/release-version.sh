#!/usr/bin/env bash
set -euo pipefail

# changeset version rewrites package.json versions; pnpm 10's
# verify-deps-before-run then refuses the follow-up sync unless this is off.
export npm_config_verify_deps_before_run=false

pnpm install --frozen-lockfile
pnpm version:packages
# After changesets bump package.json versions, lock the scaffold/CLI
# caret registry to the new numbers so create-sailor / nebutra add
# never ship stale ranges.
pnpm package-versions:sync
