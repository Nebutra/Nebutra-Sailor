import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getReleaseSurfaceDiagnostics } from "./release-surface.mjs";

const IDENTITY_RELATIVE_PATH = "config/npm-publish-identity.json";
const NPM_REGISTRY_URL = "https://registry.npmjs.org";

export function readNpmPublishIdentity(root = process.cwd()) {
  return JSON.parse(readFileSync(join(root, IDENTITY_RELATIVE_PATH), "utf8"));
}

export function isUnscopedPackageName(name) {
  return typeof name === "string" && !name.startsWith("@");
}

export function npmVersionSupportsTrustedPublishing(version) {
  const [major = 0, minor = 0, patch = 0] = String(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  return major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)));
}

export function encodeNpmPackagePath(packageName) {
  return packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);
}

export function getNpmPublishIdentityDiagnostics(root = process.cwd()) {
  const identity = readNpmPublishIdentity(root);
  const surface = getReleaseSurfaceDiagnostics(root);
  const listed = [...new Set((identity.unscoped ?? []).map((entry) => entry.name))].sort();
  const listedSet = new Set(listed);
  const actual = surface.publishable
    .filter((entry) => isUnscopedPackageName(entry.manifest.name))
    .map((entry) => entry.manifest.name)
    .sort();
  const actualSet = new Set(actual);

  return {
    identity,
    identityPath: IDENTITY_RELATIVE_PATH,
    repository: identity.repository,
    workflowFile: identity.workflowFile,
    listed,
    actual,
    missingFromConfig: actual.filter((name) => !listedSet.has(name)),
    extraInConfig: listed.filter((name) => !actualSet.has(name)),
    publishableByName: new Map(surface.publishable.map((entry) => [entry.manifest.name, entry])),
  };
}

export function formatTrustedPublisherSetup(identity, packageName) {
  return [
    `Add a GitHub Actions trusted publisher on https://www.npmjs.com/package/${packageName}/access`,
    `  Organization or user: ${identity.repository.split("/")[0]}`,
    `  Repository: ${identity.repository.split("/")[1]}`,
    `  Workflow filename: ${identity.workflowFile}`,
    "  Environment name: (leave empty)",
    "  Allowed actions: npm publish",
  ].join("\n");
}

export async function npmVersionExists(packageName, version, fetchImpl = fetch) {
  const response = await fetchImpl(
    `${NPM_REGISTRY_URL}/${encodeNpmPackagePath(packageName)}/${version}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "nebutra-sailor-npm-publish-identity",
      },
    },
  );

  if (response.status === 404) return false;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`npm registry ${response.status} for ${packageName}@${version}: ${text}`);
  }

  return true;
}

export async function listPendingUnscopedPackages(root = process.cwd(), fetchImpl = fetch) {
  const diagnostics = getNpmPublishIdentityDiagnostics(root);
  const pending = [];

  for (const name of diagnostics.listed) {
    const entry = diagnostics.publishableByName.get(name);
    if (!entry) continue;

    const version = entry.manifest.version;
    const published = await npmVersionExists(name, version, fetchImpl);
    if (!published) {
      pending.push({
        name,
        version,
        packageDir: entry.packageDir,
        reason: diagnostics.identity.unscoped.find((item) => item.name === name)?.reason,
      });
    }
  }

  return { diagnostics, pending };
}
