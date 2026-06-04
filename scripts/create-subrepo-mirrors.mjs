#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getGithubToken, resolveSubrepoMirrors } from "./lib/subrepo-mirrors.mjs";

const GITHUB_API_URL = process.env.GITHUB_API_URL ?? "https://api.github.com";
const GITHUB_API_PATH_PATTERN = /^\/[A-Za-z0-9._~/%-]+$/;

function parseArgs(argv) {
  const args = {
    apply: false,
    cohort: "first-wave",
    packageName: undefined,
    repoName: undefined,
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg.startsWith("--cohort=")) args.cohort = arg.slice("--cohort=".length);
    else if (arg.startsWith("--package=")) args.packageName = arg.slice("--package=".length);
    else if (arg.startsWith("--repo=")) args.repoName = arg.slice("--repo=".length);
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: node scripts/create-subrepo-mirrors.mjs [options]",
          "",
          "Options:",
          "  --apply              Create/update repos; without this, dry-run only",
          "  --cohort=<name>      Mirror cohort to create (default: first-wave)",
          "  --package=<name>     Limit to one package",
          "  --repo=<name>        Limit to one repo",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  return args;
}

function resolveToken() {
  const token = getGithubToken();
  if (token) return token;

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function pathSegment(value) {
  return encodeURIComponent(value);
}

function githubApiPath(path) {
  if (!GITHUB_API_PATH_PATTERN.test(path)) {
    throw new Error(`Unsafe GitHub API path: ${path}`);
  }

  return new URL(path, GITHUB_API_URL).toString();
}

async function github(path, token, options = {}) {
  const response = await fetch(githubApiPath(path), {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "nebutra-subrepo-mirror-provisioner",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) return null;
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message ?? text;
    const error = new Error(`GitHub API ${response.status} ${path}: ${message}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

async function getRepo(owner, repo, token) {
  try {
    return await github(`/repos/${pathSegment(owner)}/${pathSegment(repo)}`, token);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function createRepo(mirror, token) {
  return github(`/orgs/${pathSegment(mirror.owner)}/repos`, token, {
    method: "POST",
    body: JSON.stringify({
      name: mirror.repoName,
      description: mirror.description,
      private: false,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
      auto_init: false,
    }),
  });
}

async function updateRepo(mirror, token) {
  await github(`/repos/${pathSegment(mirror.owner)}/${pathSegment(mirror.repoName)}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      description: mirror.description,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    }),
  });
  await github(
    `/repos/${pathSegment(mirror.owner)}/${pathSegment(mirror.repoName)}/topics`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        names: mirror.topics,
      }),
    },
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = resolveToken();
  if (!token) {
    throw new Error(
      "No GitHub token available. Set SUBREPO_MIRROR_TOKEN/GITHUB_TOKEN/GH_TOKEN or run `gh auth login`.",
    );
  }

  const { mirrors } = resolveSubrepoMirrors({
    cohort: args.cohort,
    packageName: args.packageName,
    repoName: args.repoName,
  });

  for (const mirror of mirrors) {
    const existing = await getRepo(mirror.owner, mirror.repoName, token);

    if (!existing) {
      if (!args.apply) {
        console.log(`[subrepo-create] would create ${mirror.owner}/${mirror.repoName}`);
        continue;
      }
      await createRepo(mirror, token);
      await updateRepo(mirror, token);
      console.log(`[subrepo-create] created ${mirror.owner}/${mirror.repoName}`);
      continue;
    }

    if (!args.apply) {
      console.log(`[subrepo-create] would update ${mirror.owner}/${mirror.repoName}`);
      continue;
    }

    await updateRepo(mirror, token);
    console.log(`[subrepo-create] updated ${mirror.owner}/${mirror.repoName}`);
  }
}

main().catch((error) => {
  console.error(`[subrepo-create] ${error.message}`);
  process.exit(1);
});
