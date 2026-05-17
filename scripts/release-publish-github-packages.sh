#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "No GITHUB_TOKEN available for GitHub Packages publishing."
  exit 1
fi

npmrc="${RUNNER_TEMP:-/tmp}/nebutra-github-packages.npmrc"
{
  echo "@nebutra:registry=https://npm.pkg.github.com"
  echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}"
} >"${npmrc}"

export NPM_CONFIG_USERCONFIG="${npmrc}"
export NPM_CONFIG_REGISTRY="https://npm.pkg.github.com"
export NPM_CONFIG_PROVENANCE=false

node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const configPath = ".changeset/config.json";
const config = JSON.parse(readFileSync(configPath, "utf8"));
config.ignore = [...new Set([...(config.ignore ?? []), "create-sailor", "nebutra"])];
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

pnpm exec changeset publish
