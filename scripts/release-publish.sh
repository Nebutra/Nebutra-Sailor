#!/usr/bin/env bash

set -euo pipefail

export NPM_CONFIG_PROVENANCE="${NPM_CONFIG_PROVENANCE:-true}"

node scripts/verify-npm-publish-identity.mjs

if [[ "${NPM_TRUSTED_PUBLISHING:-}" == "true" ]]; then
  echo "Publishing with npm trusted publishing (OIDC provenance enabled)"
  unset NODE_AUTH_TOKEN
  unset NPM_TOKEN
  pnpm exec changeset publish
  exit 0
fi

if [[ -n "${NPM_TOKEN:-}" ]]; then
  # Unscoped CLIs (`create-sailor`, `nebutra`) are owned outside the nebutra
  # npm org. The org-scoped granular token returns E404 on PUT. Publish those
  # first via OIDC, then let changesets publish the scoped remainder.
  echo "Publishing unscoped CLIs via OIDC; scoped @nebutra/* via npm token"
  node scripts/publish-unscoped-packages.mjs

  export NODE_AUTH_TOKEN="${NPM_TOKEN}"
  # Provenance attestation requires OIDC. With token-only auth, npm publish
  # exits 0 but silently skips publication for packages where attestation
  # would be required — disable explicitly so token-fallback is honest.
  export NPM_CONFIG_PROVENANCE=false
  pnpm exec changeset publish
  node scripts/ensure-npm-public-access.mjs
  exit 0
fi

echo "No npm publish credentials available."
echo "Set repository variable NPM_TRUSTED_PUBLISHING=true after configuring npm trusted publishing,"
echo "or provide secrets.NPM_TOKEN as a temporary fallback."
exit 1
