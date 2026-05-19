#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const MAX_ATTEMPTS = 3;

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  }).trim();
}

function remoteHasTag(tag) {
  return git(["ls-remote", "--tags", "origin", tag]) !== "";
}

function localHasTag(tag) {
  try {
    git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function pushTag(tag) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      git(["push", "origin", `refs/tags/${tag}:refs/tags/${tag}`], {
        stdio: ["ignore", "inherit", "inherit"],
      });
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      sleep(1000 * attempt);
    }
  }
}

const tags = getReleaseSurfaceDiagnostics()
  .publishable.map(({ manifest }) => `${manifest.name}@${manifest.version}`)
  .sort();

let pushed = 0;
for (const tag of tags) {
  if (remoteHasTag(tag)) continue;
  if (!localHasTag(tag)) {
    git(["tag", "-a", tag, "HEAD", "-m", tag]);
  }
  pushTag(tag);
  pushed += 1;
}

console.log(`[release-tags] pushed ${pushed} missing tag(s); checked ${tags.length}`);
