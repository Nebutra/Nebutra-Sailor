#!/usr/bin/env bash
set -euo pipefail

# changeset version rewrites package.json versions; pnpm 11's
# verify-deps-before-run then refuses the follow-up sync unless this is off.
# pnpm 11 ignores the npm_config_ env form, so pass it as a flag as well.
export npm_config_verify_deps_before_run=false
NO_VERIFY=(--config.verify-deps-before-run=false)

pnpm install --frozen-lockfile
pnpm "${NO_VERIFY[@]}" version:packages
# After changesets bump package.json versions, lock the scaffold/CLI
# caret registry to the new numbers so create-sailor / nebutra add
# never ship stale ranges.
pnpm "${NO_VERIFY[@]}" package-versions:sync
