#!/usr/bin/env bash
# Make a pnpm-deploy stage safe to Docker COPY.
# pnpm leaves store symlinks; Docker will not follow them, so the image
# would boot with an empty node_modules. Also write a stage-local
# .dockerignore so a repo-root "**/node_modules" rule cannot apply.
set -euo pipefail

stage="${1:?stage dir}"
nm="$stage/node_modules"
if [ -d "$nm" ]; then
  rm -rf "$stage/node_modules.real"
  cp -aL "$nm" "$stage/node_modules.real"
  rm -rf "$nm"
  mv "$stage/node_modules.real" "$nm"
fi
printf '%s\n' "# pnpm-deploy bundle — do not drop node_modules" > "$stage/.dockerignore"
du -sh "$stage" "$nm"
