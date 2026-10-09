#!/usr/bin/env bash
# One-shot, idempotent bootstrap for the self-hosted Inngest server (ADR 2026-10-02).
#
#   bash infra/ops/scripts/bootstrap-inngest.sh
#
# Run it from a checkout of main that contains infra/fly/inngest.toml, logged in
# to flyctl and gh. Creates (if missing) the nebutra-inngest app and its volume,
# generates the event and signing keys with openssl and sets the SAME values on
# nebutra-inngest and nebutra-gateway, sets the Redis URI, deploys the server,
# then deploys the gateway and runs the registration guard.
#
# Idempotent: a key pair is generated only when either app lacks it (the value
# cannot be read back, so both apps are always re-set together). Re-running with
# everything in place only redeploys. Secret values are never printed or logged.
# Env: REDIS_PASSWORD (optional; read from the nebutra-redis Machine if unset),
#      SKIP_GATEWAY_DEPLOY=1 to stop after the Inngest server is up.
set -euo pipefail

INNGEST_APP=nebutra-inngest
GATEWAY_APP=nebutra-gateway
REDIS_APP=nebutra-redis
REGION=sin
cd "$(git rev-parse --show-toplevel)"
TOML=infra/fly/inngest.toml
[ -f "$TOML" ] || { echo "$TOML missing: run from a checkout that has it" >&2; exit 1; }
for c in flyctl openssl python3 curl; do command -v "$c" >/dev/null || { echo "need $c" >&2; exit 1; }; done

# A staged (not yet deployed) secret lists as " * NAME"; both states count.
has_secret() { flyctl secrets list -a "$1" 2>/dev/null | grep -qE "^ *(\* )?$2 "; }
app_exists() { flyctl apps list --json | python3 -c "import json,sys; n={a.get('Name') or a.get('name') for a in json.load(sys.stdin)}; sys.exit(0 if '$1' in n else 1)"; }

flyctl auth whoami >/dev/null 2>&1 || { echo "flyctl is not logged in — run: fly auth login" >&2; exit 1; }

# The server must share the gateway's org: Fly's private network (.internal)
# does not cross orgs. Take the org from the gateway itself, never a guess —
# a "personal" fallback once created the app where the gateway cannot reach it.
app_org() { flyctl apps list --json | python3 -c "
import json,sys
for a in json.load(sys.stdin):
    if (a.get('Name') or a.get('name'))=='$1':
        o=a.get('Organization') or a.get('organization') or {}
        print(o.get('Slug') or o.get('slug') or ''); break"; }
GATEWAY_ORG="$(app_org "$GATEWAY_APP")"
[ -n "$GATEWAY_ORG" ] || { echo "could not read $GATEWAY_APP's org" >&2; exit 1; }

echo "== app and volume (org $GATEWAY_ORG)"
if app_exists "$INNGEST_APP"; then
  have_org="$(app_org "$INNGEST_APP")"
  if [ "$have_org" != "$GATEWAY_ORG" ]; then
    echo "$INNGEST_APP exists in org '$have_org', not '$GATEWAY_ORG' — it cannot reach $GATEWAY_APP." >&2
    echo "Destroy it (fly apps destroy $INNGEST_APP -y) and re-run this script." >&2
    exit 1
  fi
  echo "app $INNGEST_APP exists"
else
  flyctl apps create "$INNGEST_APP" --machines --org "$GATEWAY_ORG" --yes
fi
if flyctl volumes list -a "$INNGEST_APP" --json | python3 -c 'import json,sys; sys.exit(0 if any((v.get("Name") or v.get("name"))=="inngest_data" for v in json.load(sys.stdin)) else 1)'; then
  echo "volume inngest_data exists"
else
  flyctl volumes create inngest_data -a "$INNGEST_APP" --region "$REGION" --size 1 --yes
fi

echo "== keys (names only are inspected)"
need_keys=0
for app in "$INNGEST_APP" "$GATEWAY_APP"; do
  for k in INNGEST_EVENT_KEY INNGEST_SIGNING_KEY; do
    has_secret "$app" "$k" || { echo "$app lacks $k"; need_keys=1; }
  done
done
if [ "$need_keys" = 1 ]; then
  event_key="$(openssl rand -hex 32)"
  signing_key="$(openssl rand -hex 32)"
  # secrets go in on stdin (flyctl secrets import), never in argv
  printf 'INNGEST_EVENT_KEY=%s\nINNGEST_SIGNING_KEY=%s\n' "$event_key" "$signing_key" \
    | flyctl secrets import -a "$INNGEST_APP" --stage >/dev/null
  printf 'INNGEST_EVENT_KEY=%s\nINNGEST_SIGNING_KEY=%s\n' "$event_key" "$signing_key" \
    | flyctl secrets import -a "$GATEWAY_APP" --stage >/dev/null
  unset event_key signing_key
  echo "generated and staged a fresh key pair on both apps"
else
  echo "keys already set on both apps; not regenerating"
fi

if has_secret "$INNGEST_APP" INNGEST_REDIS_URI; then
  echo "INNGEST_REDIS_URI already set"
else
  pw="${REDIS_PASSWORD:-}"
  if [ -z "$pw" ]; then
    pw="$(flyctl ssh console -a "$REDIS_APP" --pty=false -C 'printenv REDIS_PASSWORD' | tr -d '\r\n')"
  fi
  [ -n "$pw" ] || { echo "could not read REDIS_PASSWORD" >&2; exit 1; }
  # logical db 1: keeps Inngest keys apart from the cache in db 0
  printf 'INNGEST_REDIS_URI=redis://default:%s@nebutra-redis.internal:6379/1\n' "$pw" \
    | flyctl secrets import -a "$INNGEST_APP" --stage >/dev/null
  unset pw
  echo "staged INNGEST_REDIS_URI"
fi

echo "== deploy $INNGEST_APP"
image="$(sed -n 's/^ *image = "\(.*\)"/\1/p' "$TOML" | head -1)"
flyctl deploy --config "$TOML" --image "$image" --ha=false --remote-only --yes
for i in 1 2 3 4 5 6 7 8; do
  if flyctl ssh console -a "$INNGEST_APP" --pty=false -C "wget -qO- --timeout=5 http://127.0.0.1:8288/health" | grep -q .; then
    echo "inngest server healthy"; break
  fi
  [ "$i" = 8 ] && { flyctl logs -a "$INNGEST_APP" --no-tail | tail -30; echo "server not healthy" >&2; exit 1; }
  sleep 8
done

if [ "${SKIP_GATEWAY_DEPLOY:-0}" = 1 ]; then echo "skipping gateway deploy"; exit 0; fi

echo "== deploy gateway (applies the staged keys, then runs the registration guard)"
command -v gh >/dev/null || { echo "need gh to dispatch the gateway deploy" >&2; exit 1; }
gh workflow run deploy-fly-gateway.yml --ref main
sleep 20
run_id="$(gh run list --workflow deploy-fly-gateway.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$run_id" --exit-status
echo "done: the workflow's Inngest guard passed (PUT sync + function_count > 0)"
