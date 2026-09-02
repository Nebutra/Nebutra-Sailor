#!/usr/bin/env bash
# Assemble a Next standalone tree the same way deploy-ecs.yml does, so Fly
# and the VM consume one artifact shape.
set -euo pipefail

WS="${1:?workspace path e.g. apps/forge}"
STAGE="${2:?output directory}"
APP="${3:-}"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$WS/.next/standalone/." "$STAGE/"
mkdir -p "$STAGE/$WS/.next"
cp -r "$WS/.next/static" "$STAGE/$WS/.next/static"
if [ -d "$WS/.next/node_modules" ]; then
  mkdir -p "$STAGE/$WS/.next/node_modules"
  cp -a "$WS/.next/node_modules/." "$STAGE/$WS/.next/node_modules/"
fi
if [ -d "$STAGE/$WS/.next/node_modules" ]; then
  mkdir -p "$STAGE/$WS/node_modules"
  for d in "$STAGE/$WS/.next/node_modules"/shiki-*; do
    [ -e "$d" ] || continue
    base="$(basename "$d")"
    ln -sfn "../.next/node_modules/${base}" "$STAGE/$WS/node_modules/${base}"
  done
fi
if [ -d "$WS/public" ]; then
  cp -r "$WS/public" "$STAGE/$WS/public"
fi
if [ "$APP" = "forge" ]; then
  STAGE="$STAGE" node scripts/copy-forge-playwright-to-standalone.mjs
fi
# kuanlan loads sharp in the 开拍 route. CI traces the glibc native; Alpine
# cannot open it, so the whole route module 500s before the 401 gate.
if [ "$APP" = "kuanlan" ]; then
  cp infra/runtime/docker/Dockerfile.standalone-glibc "$STAGE/Dockerfile"
else
  cp infra/runtime/docker/Dockerfile.standalone "$STAGE/Dockerfile"
fi
