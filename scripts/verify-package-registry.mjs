#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const DEFAULT_REPOSITORY = "Nebutra/Nebutra-Sailor";
const GITHUB_API_URL = process.env.GITHUB_API_URL ?? "https://api.github.com";
const FETCH_RETRY_ATTEMPTS = Number.parseInt(process.env.PACKAGE_REGISTRY_FETCH_RETRIES ?? "4", 10);

const legacyContainerPackages = new Set([
  "nebutra-billing",
  "nebutra-content",
  "nebutra-ecommerce",
  "nebutra-event-ingest",
  "nebutra-recsys",
  "nebutra-web3",
]);

const allowedContainerPackages = new Set([
  "nebutra-ai",
  "nebutra-api-gateway",
  "nebutra-landing-page",
  "nebutra-web",
]);

let insideGitWorkTree;

function resolveRepository() {
  const repository =
    process.env.PACKAGE_REGISTRY_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY;
  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository value: ${repository}`);
  }

  return {
    owner,
    org: process.env.PACKAGE_REGISTRY_ORG ?? owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

function resolveToken() {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) return envToken;

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeFetchError(error) {
  const causeCode = error?.cause?.code;
  const causeMessage = error?.cause?.message;
  const cause = [causeCode, causeMessage].filter(Boolean).join(": ");

  return cause ? `${error.message} (${cause})` : error.message;
}

async function fetchWithRetry(url, options) {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_ATTEMPTS) {
        await sleep(500 * attempt);
      }
    }
  }

  throw new Error(`fetch failed for ${url}: ${describeFetchError(lastError)}`);
}

async function githubApi(path, token) {
  const url = `${GITHUB_API_URL}${path}`;
  const response = await fetchWithRetry(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "nebutra-sailor-package-registry-governance",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} for ${path}: ${text}`);
  }

  return response.json();
}

async function listOrgPackages(org, packageType, token) {
  const packages = [];

  for (let page = 1; ; page += 1) {
    const batch = await githubApi(
      `/orgs/${org}/packages?package_type=${packageType}&per_page=100&page=${page}`,
      token,
    );
    packages.push(...batch);
    if (batch.length < 100) break;
  }

  return packages;
}

async function listContainerPackages(org, token) {
  try {
    return {
      packages: await listOrgPackages(org, "container", token),
      skippedReason: "",
    };
  } catch (error) {
    if (shouldRequireContainerAudit()) {
      throw error;
    }

    return {
      packages: [],
      skippedReason: error.message,
    };
  }
}

function githubNpmName(packageName) {
  const scope = "@nebutra/";
  return packageName.startsWith(scope) ? packageName.slice(scope.length) : null;
}

function shouldVerifyNpmjs() {
  return process.env.PACKAGE_REGISTRY_VERIFY_NPMJS === "true";
}

function shouldIncludeUntracked() {
  return process.env.PACKAGE_REGISTRY_INCLUDE_UNTRACKED === "true";
}

function shouldRequireContainerAudit() {
  return process.env.PACKAGE_REGISTRY_REQUIRE_CONTAINER_AUDIT === "true";
}

function isInsideGitWorkTree() {
  if (insideGitWorkTree !== undefined) return insideGitWorkTree;

  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    insideGitWorkTree = true;
    return insideGitWorkTree;
  } catch {
    insideGitWorkTree = false;
    return insideGitWorkTree;
  }
}

function isTrackedByGit(filePath) {
  if (shouldIncludeUntracked()) return true;
  if (!isInsideGitWorkTree()) return true;

  try {
    execFileSync("git", ["ls-files", "--error-unmatch", relative(process.cwd(), filePath)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

async function npmjsPackageExists(packageName) {
  const encodedName = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);
  const response = await fetchWithRetry(`https://registry.npmjs.org/${encodedName}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "nebutra-sailor-package-registry-governance",
    },
  });

  if (response.status === 404) return false;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`npm registry ${response.status} for ${packageName}: ${text}`);
  }

  return true;
}

async function findMissingNpmjsPackages(packageNames) {
  const missing = [];

  for (const packageName of packageNames) {
    if (!(await npmjsPackageExists(packageName))) {
      missing.push(packageName);
    }
  }

  return missing.sort();
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function formatList(values) {
  return values.length === 0 ? "none" : values.join(", ");
}

async function main() {
  const token = resolveToken();
  if (!token) {
    throw new Error("No GitHub token available. Set GITHUB_TOKEN/GH_TOKEN or run `gh auth login`.");
  }

  const repository = resolveRepository();
  const releaseSurface = getReleaseSurfaceDiagnostics();
  const publishable = releaseSurface.publishable.filter((entry) =>
    isTrackedByGit(entry.manifestPath),
  );
  const skippedUntracked = releaseSurface.publishable
    .filter((entry) => !isTrackedByGit(entry.manifestPath))
    .map((entry) => entry.manifest.name)
    .sort();
  const expectedNpmjsPackages = publishable.map((entry) => entry.manifest.name);
  const expectedGithubNpm = new Set(
    expectedNpmjsPackages.map((name) => githubNpmName(name)).filter(Boolean),
  );

  const [npmPackages, containerPackageResult] = await Promise.all([
    listOrgPackages(repository.org, "npm", token),
    listContainerPackages(repository.org, token),
  ]);
  const containerPackages = containerPackageResult.packages;

  const repoNpmPackages = npmPackages.filter(
    (entry) => entry.repository?.full_name === repository.fullName,
  );
  const repoContainerPackages = containerPackages.filter(
    (entry) => entry.repository?.full_name === repository.fullName,
  );

  const actualGithubNpm = new Set(repoNpmPackages.map((entry) => entry.name));
  const actualContainers = new Set(repoContainerPackages.map((entry) => entry.name));

  const missingNpmMirrors = difference(expectedGithubNpm, actualGithubNpm);
  const orphanNpmPackages = difference(actualGithubNpm, expectedGithubNpm);
  const privateNpmPackages = repoNpmPackages
    .filter((entry) => entry.visibility !== "public")
    .map((entry) => entry.name)
    .sort();
  const legacyContainers = [...actualContainers]
    .filter((name) => legacyContainerPackages.has(name))
    .sort();
  const unexpectedContainers = [...actualContainers]
    .filter((name) => !allowedContainerPackages.has(name) && !legacyContainerPackages.has(name))
    .sort();
  const missingNpmjsPackages = shouldVerifyNpmjs()
    ? await findMissingNpmjsPackages(expectedNpmjsPackages)
    : [];

  console.log(
    `[package-registry] ${repository.fullName}: expected ${expectedGithubNpm.size} GitHub npm mirrors, found ${actualGithubNpm.size}`,
  );
  console.log(
    `[package-registry] skipped untracked publishable packages: ${formatList(skippedUntracked)}`,
  );
  console.log(`[package-registry] private GitHub npm packages: ${formatList(privateNpmPackages)}`);
  console.log(`[package-registry] missing GitHub npm mirrors: ${formatList(missingNpmMirrors)}`);
  console.log(`[package-registry] orphan GitHub npm packages: ${formatList(orphanNpmPackages)}`);
  if (containerPackageResult.skippedReason) {
    console.log(
      `[package-registry] container package check: skipped (${containerPackageResult.skippedReason})`,
    );
  } else {
    console.log(`[package-registry] legacy container packages: ${formatList(legacyContainers)}`);
    console.log(
      `[package-registry] unexpected container packages: ${formatList(unexpectedContainers)}`,
    );
  }
  console.log(
    shouldVerifyNpmjs()
      ? `[package-registry] missing npmjs packages: ${formatList(missingNpmjsPackages)}`
      : "[package-registry] npmjs package check: skipped",
  );

  const failures = [
    ...privateNpmPackages.map((name) => `${name} is still private in GitHub Packages`),
    ...missingNpmMirrors.map((name) => `${name} is missing from GitHub Packages`),
    ...orphanNpmPackages.map((name) => `${name} is present but not publishable from source`),
    ...legacyContainers.map((name) => `${name} legacy container package still exists`),
    ...unexpectedContainers.map((name) => `${name} container package is not allowlisted`),
    ...missingNpmjsPackages.map((name) => `${name} is missing from npmjs`),
  ];

  if (failures.length > 0) {
    console.error("[package-registry] registry governance failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("[package-registry] registry governance passed");
}

main().catch((error) => {
  console.error(`[package-registry] ${error.message}`);
  process.exit(1);
});
