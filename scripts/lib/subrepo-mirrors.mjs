import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getReleaseSurfaceDiagnostics } from "./release-surface.mjs";

export const SUBREPO_MIRROR_CONFIG = "config/subrepo-mirrors.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readSubrepoMirrorConfig(root = process.cwd()) {
  return readJson(join(root, SUBREPO_MIRROR_CONFIG));
}

export function readCatalogVersions(root = process.cwd()) {
  const workspacePath = join(root, "pnpm-workspace.yaml");
  const text = readFileSync(workspacePath, "utf8");
  const versions = new Map();
  let inCatalog = false;

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "catalog:") {
      inCatalog = true;
      continue;
    }

    if (!inCatalog) continue;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (!line.startsWith("  ")) break;

    const match = line.match(/^\s{2}("?[^":]+"?):\s*(\S+)\s*$/);
    if (!match) continue;

    const name = match[1].replace(/^"|"$/g, "");
    versions.set(name, match[2]);
  }

  return versions;
}

function assertValidRepoName(repoName) {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(repoName)) {
    throw new Error(`Invalid subrepo name: ${repoName}`);
  }
}

function assertValidTopics(mirror) {
  if (!Array.isArray(mirror.topics)) {
    throw new Error(`${mirror.packageName} topics must be an array`);
  }

  if (mirror.topics.length > 20) {
    throw new Error(`${mirror.packageName} has ${mirror.topics.length} topics; GitHub allows 20`);
  }

  for (const topic of mirror.topics) {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(topic)) {
      throw new Error(`${mirror.packageName} has invalid GitHub topic: ${topic}`);
    }
  }
}

export function resolveSubrepoMirrors(options = {}) {
  const root = options.root ?? process.cwd();
  const config = readSubrepoMirrorConfig(root);
  const releaseSurface = getReleaseSurfaceDiagnostics(root);
  const byPackageName = new Map(
    releaseSurface.publishable.map((entry) => [entry.manifest.name, entry]),
  );

  const packageNames = new Set();
  const repoNames = new Set();
  const mirrors = [];

  for (const mirror of config.mirrors) {
    if (mirror.enabled === false && !options.includeDisabled) continue;
    if (options.cohort && mirror.cohort !== options.cohort) continue;
    if (options.packageName && mirror.packageName !== options.packageName) continue;
    if (options.repoName && mirror.repoName !== options.repoName) continue;

    assertValidRepoName(mirror.repoName);
    assertValidTopics(mirror);

    if (packageNames.has(mirror.packageName)) {
      throw new Error(`Duplicate subrepo mirror package: ${mirror.packageName}`);
    }
    if (repoNames.has(mirror.repoName)) {
      throw new Error(`Duplicate subrepo mirror repo: ${mirror.repoName}`);
    }
    packageNames.add(mirror.packageName);
    repoNames.add(mirror.repoName);

    const packageEntry = byPackageName.get(mirror.packageName);
    if (!packageEntry) {
      throw new Error(`${mirror.packageName} is not a publishable workspace package`);
    }
    if (packageEntry.relativeDir !== mirror.sourceDir) {
      throw new Error(
        `${mirror.packageName} sourceDir mismatch: manifest=${mirror.sourceDir}, workspace=${packageEntry.relativeDir}`,
      );
    }
    if (!existsSync(join(root, mirror.sourceDir, "package.json"))) {
      throw new Error(`${mirror.packageName} sourceDir is missing package.json`);
    }

    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "devDependencies",
    ]) {
      for (const [dependencyName, range] of Object.entries(packageEntry.manifest[field] ?? {})) {
        if (typeof range !== "string" || !range.startsWith("workspace:")) continue;
        if (!byPackageName.has(dependencyName)) {
          throw new Error(
            `${mirror.packageName} ${field} references non-publishable workspace dependency ${dependencyName}`,
          );
        }
      }
    }

    mirrors.push({
      ...mirror,
      owner: config.owner,
      sourceRepository: config.sourceRepository,
      defaultBranch: config.defaultBranch,
      packageEntry,
    });
  }

  return {
    config,
    releaseSurface,
    mirrors,
  };
}

export function getCurrentGitSha(root = process.cwd()) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function getGithubToken() {
  const envToken = process.env.SUBREPO_MIRROR_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
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

export function githubPackageName(packageName) {
  const scope = "@nebutra/";
  return packageName.startsWith(scope) ? packageName.slice(scope.length) : packageName;
}
