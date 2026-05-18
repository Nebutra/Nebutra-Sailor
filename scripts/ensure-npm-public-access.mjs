#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";

function publicScopedPackages() {
  return getReleaseSurfaceDiagnostics()
    .publishable.map((entry) => entry.manifest)
    .filter(
      (manifest) =>
        manifest.name?.startsWith("@nebutra/") && manifest.publishConfig?.access === "public",
    )
    .map((manifest) => manifest.name)
    .sort();
}

async function isPubliclyVisible(packageName) {
  const encodedName = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);
  const response = await fetch(`${NPM_REGISTRY_URL}/${encodedName}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "nebutra-sailor-npm-access-public",
    },
  });

  if (response.status === 404) return false;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`npm registry ${response.status} for ${packageName}: ${text}`);
  }

  return true;
}

function setPublicAccess(packageName) {
  console.log(`[npm-access] setting public access for ${packageName}`);
  execFileSync("npm", ["access", "public", packageName, "--registry", NPM_REGISTRY_URL], {
    stdio: "inherit",
  });
}

async function main() {
  const packageNames = publicScopedPackages();
  let updatedCount = 0;

  for (const packageName of packageNames) {
    if (await isPubliclyVisible(packageName)) {
      continue;
    }

    setPublicAccess(packageName);
    updatedCount += 1;
  }

  console.log(`[npm-access] public access repaired for ${updatedCount} package(s)`);
}

main().catch((error) => {
  console.error(`[npm-access] ${error.message}`);
  process.exit(1);
});
