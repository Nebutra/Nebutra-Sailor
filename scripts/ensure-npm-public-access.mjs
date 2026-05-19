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
  // npm 9+ replaced `npm access public <pkg>` with
  // `npm access set status=public <pkg>`. Newer runners ship an npm that
  // rejects the old form with EUSAGE ("public is not a valid access
  // command"), failing the whole release.
  execFileSync(
    "npm",
    ["access", "set", "status=public", packageName, "--registry", NPM_REGISTRY_URL],
    { stdio: "inherit" },
  );
}

async function main() {
  const packageNames = publicScopedPackages();
  let updatedCount = 0;
  const failures = [];

  for (const packageName of packageNames) {
    if (await isPubliclyVisible(packageName)) {
      continue;
    }

    try {
      setPublicAccess(packageName);
      updatedCount += 1;
    } catch (error) {
      // A single missing/private package shouldn't kill the whole release —
      // changeset publish has already shipped the bumped tarballs. Log and
      // continue so the operator can investigate after the workflow ends.
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[npm-access] failed to set public access for ${packageName}: ${message}`);
      failures.push(packageName);
    }
  }

  console.log(`[npm-access] public access repaired for ${updatedCount} package(s)`);
  if (failures.length > 0) {
    console.warn(
      `[npm-access] ${failures.length} package(s) need manual review: ${failures.join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(`[npm-access] ${error.message}`);
  process.exit(1);
});
