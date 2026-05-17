#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "No GITHUB_TOKEN available for GitHub Packages visibility repair."
  exit 1
fi

npmrc="${RUNNER_TEMP:-/tmp}/nebutra-github-packages-visibility.npmrc"
{
  echo "@nebutra:registry=https://npm.pkg.github.com"
  echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}"
} >"${npmrc}"

export NPM_CONFIG_USERCONFIG="${npmrc}"
export NPM_CONFIG_REGISTRY="https://npm.pkg.github.com"
export NPM_CONFIG_PROVENANCE=false

mapfile -t packages < <(
  node --input-type=module <<'NODE'
import { getReleaseSurfaceDiagnostics } from "./scripts/lib/release-surface.mjs";

for (const entry of getReleaseSurfaceDiagnostics().publishable) {
  const name = entry.manifest.name;
  if (name.startsWith("@nebutra/")) {
    console.log(name);
  }
}
NODE
)

if [[ "${#packages[@]}" -eq 0 ]]; then
  echo "No scoped @nebutra packages found."
  exit 0
fi

for package_name in "${packages[@]}"; do
  echo "::group::Publicize ${package_name}"
  npm access get status "${package_name}" --registry=https://npm.pkg.github.com || true
  npm access set status=public "${package_name}" --registry=https://npm.pkg.github.com
  npm access get status "${package_name}" --registry=https://npm.pkg.github.com
  echo "::endgroup::"
done
