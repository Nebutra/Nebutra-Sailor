#!/usr/bin/env bash

set -euo pipefail

export NPM_CONFIG_PROVENANCE="${NPM_CONFIG_PROVENANCE:-true}"

if [[ "${NPM_TRUSTED_PUBLISHING:-}" == "true" ]]; then
  echo "Publishing with npm trusted publishing (OIDC provenance enabled)"
  unset NODE_AUTH_TOKEN
  unset NPM_TOKEN
  pnpm exec changeset publish
  exit 0
fi

if [[ -n "${NPM_TOKEN:-}" ]]; then
  echo "Publishing with npm token fallback (OIDC not enabled yet)"
  export NODE_AUTH_TOKEN="${NPM_TOKEN}"
  pnpm exec changeset publish
  exit 0
fi

echo "No npm publish credentials available."
echo "Set repository variable NPM_TRUSTED_PUBLISHING=true after configuring npm trusted publishing,"
echo "or provide secrets.NPM_TOKEN as a temporary fallback."
exit 1
