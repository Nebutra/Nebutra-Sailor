#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm version:packages
# After changesets bump package.json versions, lock the scaffold/CLI
# caret registry to the new numbers so create-sailor / nebutra add
# never ship stale ranges.
pnpm package-versions:sync
