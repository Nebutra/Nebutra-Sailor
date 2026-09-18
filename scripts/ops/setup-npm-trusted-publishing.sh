#!/usr/bin/env bash
#
# Configure npm trusted publishing (OIDC) for every scoped package.
#
# Run it in a terminal:
#   bash scripts/ops/setup-npm-trusted-publishing.sh
#
# npm requires 2FA for this (it is an account-settings change, so even reads
# need it). In a terminal it prints an npmjs URL and WAITS for you to approve,
# then reuses that elevated session for the rest of the run.
#
# That wait only happens when npm can see a TTY on stdout. An earlier version of
# this script captured output with `output=$(npm trust ... 2>&1)`, which put a
# pipe there — so npm skipped the browser flow and failed with EOTP instantly,
# in a real terminal, and the script looked like it was the terminal's fault.
# Do not reintroduce command substitution around these calls.
#
# Without a TTY (agent session, CI), pass a code instead:
#   NPM_OTP=123456 bash scripts/ops/setup-npm-trusted-publishing.sh
#
# The unscoped CLIs (create-sailor, nebutra) already publish via OIDC and are
# not listed here.
#
# Only after every package succeeds:
#   gh variable set NPM_TRUSTED_PUBLISHING --body true
#
# Flipping that variable first breaks the next release outright:
# scripts/release-publish.sh unsets the token on the trusted-publishing path,
# so any package without trust configured fails to publish.

set -uo pipefail

REPO="${NPM_TRUST_REPO:-Nebutra/Nebutra-Sailor}"
WORKFLOW="${NPM_TRUST_WORKFLOW:-release.yml}"

OTP_ARGS=()
if [ -n "${NPM_OTP:-}" ]; then
  OTP_ARGS=(--otp "$NPM_OTP")
fi

# --verify reports which packages actually carry the trust relationship, rather
# than trusting that a successful setup run means every one of them landed. The
# 2FA session can expire part-way through a long run, which is exactly how two
# packages were left unconfigured while the run still looked like it worked.
VERIFY=0
[ "${1:-}" = "--verify" ] && VERIFY=1

PACKAGES=(
  "@nebutra/3d-pipeline"
  "@nebutra/agent-runtime"
  "@nebutra/agents"
  "@nebutra/ai-primitives"
  "@nebutra/ai-providers"
  "@nebutra/atelier-canvas"
  "@nebutra/audio-pipeline"
  "@nebutra/audit"
  "@nebutra/billing"
  "@nebutra/brand"
  "@nebutra/brand-genesis"
  "@nebutra/browser-control"
  "@nebutra/cache"
  "@nebutra/capability-kit"
  "@nebutra/cinema"
  "@nebutra/code-execution"
  "@nebutra/code-index"
  "@nebutra/cofounder-match"
  "@nebutra/collab"
  "@nebutra/content-store"
  "@nebutra/contracts"
  "@nebutra/design-sync"
  "@nebutra/design-tokens"
  "@nebutra/document-pipeline"
  "@nebutra/ecosystem-safety"
  "@nebutra/email"
  "@nebutra/errors"
  "@nebutra/event-log"
  "@nebutra/execution-policy"
  "@nebutra/fonts"
  "@nebutra/forge-dns-leak"
  "@nebutra/forge-runtime"
  "@nebutra/founder-cemetery"
  "@nebutra/generation-context"
  "@nebutra/graph-model"
  "@nebutra/icons"
  "@nebutra/idea-plaza"
  "@nebutra/identity"
  "@nebutra/image-pipeline"
  "@nebutra/integration-vault"
  "@nebutra/knowledge-base"
  "@nebutra/knowledge-graph"
  "@nebutra/knowledge-rag"
  "@nebutra/landing-builder"
  "@nebutra/license"
  "@nebutra/local-embedding"
  "@nebutra/logger"
  "@nebutra/mcp"
  "@nebutra/metering"
  "@nebutra/notifications"
  "@nebutra/outreach-engine"
  "@nebutra/permissions"
  "@nebutra/play-loader"
  "@nebutra/play-marketplace"
  "@nebutra/prepaid-wallet"
  "@nebutra/provider-factory"
  "@nebutra/queue"
  "@nebutra/reel"
  "@nebutra/router-supply"
  "@nebutra/sandbox-runtime"
  "@nebutra/search"
  "@nebutra/support-deflector"
  "@nebutra/tenant"
  "@nebutra/tenant-store"
  "@nebutra/theme"
  "@nebutra/time-machine"
  "@nebutra/tokens"
  "@nebutra/tool-registry"
  "@nebutra/trace-store"
  "@nebutra/tts"
  "@nebutra/typelens-catalog"
  "@nebutra/ui"
  "@nebutra/uploads"
  "@nebutra/vault"
  "@nebutra/video-compose"
  "@nebutra/video-pipeline"
  "@nebutra/voice-realtime"
  "@nebutra/webhooks"
  "@nebutra/workflow-runtime"
)

if [ "$VERIFY" -eq 1 ]; then
  missing=()
  present=0
  for p in "${PACKAGES[@]}"; do
    if npm trust list "$p" "${OTP_ARGS[@]}" 2>/dev/null | grep -q "$REPO"; then
      present=$((present + 1))
      printf '  ok      %s\n' "$p"
    else
      missing+=("$p")
      printf '  MISSING %s\n' "$p"
    fi
  done
  printf '\n%d/%d carry trust for %s\n' "$present" "${#PACKAGES[@]}" "$REPO"
  if [ "${#missing[@]}" -ne 0 ]; then
    printf '\nRun setup again for these before flipping NPM_TRUSTED_PUBLISHING:\n'
    printf '  %s\n' "${missing[@]}"
    exit 1
  fi
  printf 'Safe to set NPM_TRUSTED_PUBLISHING=true.\n'
  exit 0
fi

ok=0
fail=0
consecutive=0
failed=()

for p in "${PACKAGES[@]}"; do
  printf '\n--- %s (%d/%d) ---\n' "$p" "$((ok + fail + 1))" "${#PACKAGES[@]}"

  # No command substitution, no pipe: npm must see the terminal to offer the
  # browser approval it needs for 2FA.
  if npm trust github "$p" \
      --repo "$REPO" --file "$WORKFLOW" --allow-publish --yes "${OTP_ARGS[@]}"; then
    ok=$((ok + 1))
    consecutive=0
  else
    fail=$((fail + 1))
    consecutive=$((consecutive + 1))
    failed+=("$p")

    # Three in a row is a condition, not bad luck — stop rather than print the
    # same error another seventy times.
    if [ "$consecutive" -ge 3 ]; then
      printf '\nStopping: 3 consecutive failures. Fix the cause and re-run —\n'
      printf 'npm trust is idempotent, so finished packages simply re-confirm.\n'
      break
    fi
  fi
done

printf '\n%d configured, %d failed (of %d)\n' "$ok" "$fail" "${#PACKAGES[@]}"

if [ "$fail" -ne 0 ]; then
  printf '\nNot configured:\n'
  printf '  %s\n' "${failed[@]}"
  exit 1
fi

printf '\nAll %d packages trust %s/%s.\n' "${#PACKAGES[@]}" "$REPO" "$WORKFLOW"
printf 'Now: gh variable set NPM_TRUSTED_PUBLISHING --body true\n'
