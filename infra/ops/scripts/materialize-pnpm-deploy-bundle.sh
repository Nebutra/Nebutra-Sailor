#!/usr/bin/env bash
# Prepare a pnpm-deploy stage for Fly/Docker.
#
# Do not dereference the tree (cp -aL explodes a pnpm store into tens of GB).
# Rename node_modules → deps so a repo-root .dockerignore of **/node_modules
# cannot drop the only runtime the image needs.
set -euo pipefail

stage="${1:?stage dir}"
nm="$stage/node_modules"
if [ ! -d "$nm" ]; then
  echo "missing $nm" >&2
  exit 1
fi
rm -rf "$stage/deps"
mv "$nm" "$stage/deps"
printf '%s\n' "# pnpm-deploy bundle — keep deps/" > "$stage/.dockerignore"
du -sh "$stage" "$stage/deps"
