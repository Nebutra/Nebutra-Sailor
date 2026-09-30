#!/usr/bin/env bash
# Guard against SERVICE_SECRET drift across Fly apps.
#
# Incident (2026-09-30): nebutra-gateway + nebutra-web held one SERVICE_SECRET
# value, nebutra-router + nebutra-admin held another. gateway -> Router
# service-to-service tokens were signed with one secret and verified with the
# other, so every call was rejected with 401 — and nothing failed loudly,
# because each app's own health check only proves it can reach itself. The
# owner found this by hand, diffing values. This script makes the drift
# impossible to miss again.
#
# It never prints or compares a raw secret. Each app's SERVICE_SECRET is
# reduced, on the Machine itself, to the first 12 hex characters of its
# sha256 — a fingerprint, not the value — and only fingerprints are printed
# or compared. The empty-string sha256 (e3b0c44298fc...) means SERVICE_SECRET
# is unset on that app; that app is skipped rather than treated as a mismatch,
# since an app that doesn't call another service over SERVICE_SECRET has no
# reason to carry one.
#
# Apps default to every `app = "..."` line in infra/fly/*.toml; pass an
# explicit list on argv to check a subset. An app with no started machine, or
# whose ssh session fails outright, is reported as skipped and does not fail
# the run — this checks the secret on Machines that are actually up, not
# deploy completeness (deploy-fly.yml's own smoke steps already cover that).
#
# Fails (exit 1) only when two or more apps each report a *set* SERVICE_SECRET
# and their fingerprints are not all identical.
set -euo pipefail

EMPTY_SHA_FINGERPRINT="e3b0c44298fc"

repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"

apps=("$@")
if [ "${#apps[@]}" -eq 0 ]; then
  while IFS= read -r app; do
    apps+=("$app")
  done < <(grep -h '^app = ' "$repo_root"/infra/fly/*.toml | sed -E 's/^app = "([^"]+)".*/\1/' | sort -u)
fi

if [ "${#apps[@]}" -eq 0 ]; then
  echo "::error::No Fly apps found under infra/fly/*.toml — nothing to check."
  exit 1
fi

fp_apps=()
fp_values=()
skipped=()

for app in "${apps[@]}"; do
  status_json="$(flyctl status -a "$app" --json 2>/dev/null || true)"
  if [ -z "$status_json" ]; then
    skipped+=("$app: flyctl status failed (no access, or app does not exist)")
    continue
  fi

  started="$(printf '%s' "$status_json" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("false")
    sys.exit(0)
machines = data.get("Machines") or []
print("true" if any(m.get("state") == "started" for m in machines) else "false")
' 2>/dev/null || echo "false")"
  if [ "$started" != "true" ]; then
    skipped+=("$app: no started machine")
    continue
  fi

  # The remote shell — not this one — must expand $SERVICE_SECRET, so the
  # whole -C command is built with the dollar sign and inner quotes escaped
  # rather than substituted here.
  remote_cmd="sh -c 'printf %s \"\$SERVICE_SECRET\" | sha256sum | cut -c1-12'"
  raw_output="$(flyctl ssh console -a "$app" --pty=false -C "$remote_cmd" 2>/dev/null || true)"
  fingerprint="$(printf '%s' "$raw_output" | grep -Eo '[0-9a-f]{12}' | tail -n1 || true)"

  if [ -z "$fingerprint" ]; then
    skipped+=("$app: ssh probe failed or returned no fingerprint")
    continue
  fi
  if [ "$fingerprint" = "$EMPTY_SHA_FINGERPRINT" ]; then
    skipped+=("$app: SERVICE_SECRET unset")
    continue
  fi

  fp_apps+=("$app")
  fp_values+=("$fingerprint")
done

echo "== SERVICE_SECRET fingerprints (sha256, first 12 hex chars — never the value) =="
if [ "${#fp_apps[@]}" -eq 0 ]; then
  echo "(no app reported a set SERVICE_SECRET)"
else
  for i in "${!fp_apps[@]}"; do
    printf '  %-24s %s\n' "${fp_apps[$i]}" "${fp_values[$i]}"
  done
fi

if [ "${#skipped[@]}" -gt 0 ]; then
  echo
  echo "== Skipped =="
  for line in "${skipped[@]}"; do
    printf '  %s\n' "$line"
  done
fi

if [ "${#fp_apps[@]}" -lt 2 ]; then
  echo
  echo "Fewer than two apps reported a fingerprint — nothing to compare."
  exit 0
fi

mismatch=0
first="${fp_values[0]}"
for v in "${fp_values[@]}"; do
  if [ "$v" != "$first" ]; then
    mismatch=1
    break
  fi
done

if [ "$mismatch" -eq 1 ]; then
  echo
  echo "::error::SERVICE_SECRET fingerprints diverge across Fly apps — service-to-service tokens between them will be rejected with 401. Realign with 'flyctl secrets set SERVICE_SECRET=... -a <app>' for every app above, then re-run this check."
  exit 1
fi

echo
echo "All ${#fp_apps[@]} apps with a set SERVICE_SECRET agree."
