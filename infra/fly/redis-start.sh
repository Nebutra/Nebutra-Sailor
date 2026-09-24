#!/bin/sh
# Starts Redis, waits for it, then runs SRH in the foreground. If either dies
# the Machine exits and Fly restarts it.
set -eu
: "${REDIS_PASSWORD:?REDIS_PASSWORD secret is required}"
: "${SRH_TOKEN:?SRH_TOKEN secret is required}"

# Redis here is 7.0 (the SRH base image's Alpine). /data/redis holds only
# files this version wrote; an earlier 7.4 experiment left RDB v12 files in
# /data that 7.0 cannot read.
mkdir -p /data/redis
redis-server --requirepass "$REDIS_PASSWORD" --dir /data/redis \
  --appendonly yes --appendfsync everysec \
  --maxmemory 384mb --maxmemory-policy volatile-lru \
  --bind "* -::*" &
REDIS_PID=$!

until redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping >/dev/null 2>&1; do
  kill -0 "$REDIS_PID" 2>/dev/null || exit 1
  sleep 0.2
done

export SRH_MODE=env
export SRH_CONNECTION_STRING="redis://default:${REDIS_PASSWORD}@127.0.0.1:6379"
cd /app
_build/prod/rel/prod/bin/prod start &
SRH_PID=$!

# Exit as soon as either process does.
while kill -0 "$REDIS_PID" 2>/dev/null && kill -0 "$SRH_PID" 2>/dev/null; do sleep 2; done
exit 1
