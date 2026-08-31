#!/usr/bin/env bash
# Prepare a pnpm-deploy stage for Fly/Docker.
#
# Repo-root .dockerignore drops **/node_modules and **/dist. Rename those
# trees so the image can COPY them. Do not dereference the pnpm store.
set -euo pipefail

stage="${1:?stage dir}"
if [ ! -d "$stage/node_modules" ]; then
  echo "missing $stage/node_modules" >&2
  exit 1
fi
if [ ! -d "$stage/dist" ]; then
  echo "missing $stage/dist" >&2
  exit 1
fi
rm -rf "$stage/deps" "$stage/app-dist"
mv "$stage/node_modules" "$stage/deps"
mv "$stage/dist" "$stage/app-dist"
printf '%s\n' "# pnpm-deploy bundle — keep deps/ and app-dist/" > "$stage/.dockerignore"
du -sh "$stage" "$stage/deps" "$stage/app-dist"
