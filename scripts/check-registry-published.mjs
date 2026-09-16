#!/usr/bin/env node
/**
 * Is the repo's current version set already on npm?
 *
 * The release workflow used to gate tags, SBOM attestation and the GitHub
 * Packages mirror on `published` — an output derived from what *this run*
 * published. That made those three steps unrecoverable: on 2026-09-14 a run
 * published 108 packages and then died in `Push release tags`, and every
 * re-dispatch afterwards had nothing left to publish, so `published` came back
 * `false` and all three were skipped while the run reported success. Git tags
 * had to be pushed by hand and no SBOM was ever produced for that release.
 *
 * Those steps do not care who published. They care whether the repo's versions
 * are on the registry. This answers that question directly, so re-dispatching
 * finishes an interrupted release instead of quietly skipping the rest of it.
 *
 * Output (stdout, one per line):
 *   published=true|false   every publishable version resolves on npm
 *   checked=<n>            packages inspected
 *   missing=<n>            versions not on the registry
 *
 * Exit code is always 0: this reports a state, it does not pass judgement on
 * it. A network failure reports `published=false` — never a false "everything
 * shipped", because the caller uses this to decide whether to stop tagging.
 */

import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const REGISTRY = process.env.NPM_REGISTRY_URL ?? "https://registry.npmjs.org";
const CONCURRENCY = 12;
const TIMEOUT_MS = 20_000;

/**
 * A scoped name is one path segment on the registry, so every character in it
 * has to be encoded rather than appended raw.
 *
 * encodeURIComponent, not `.replace("/", "%2F")`: a string pattern replaces
 * only the FIRST occurrence, so that spelling depends on a package name never
 * containing a second slash. npm does not allow one today, which is exactly
 * what makes the bug invisible until the day it isn't. The registry accepts
 * both `@scope%2Fname` and the fully-encoded `%40scope%2Fname` (verified: HTTP
 * 200 for each), so there is nothing to trade away for the safe spelling.
 */
function packumentUrl(name) {
  return `${REGISTRY}/${encodeURIComponent(name)}`;
}

async function hasVersion(name, version) {
  let response;
  try {
    response = await fetch(packumentUrl(name), {
      headers: {
        // The abbreviated document is a fraction of the size and still carries
        // every published version key, which is all this needs.
        Accept: "application/vnd.npm.install-v1+json, application/json",
        "User-Agent": "nebutra-release-check",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return { name, version, ok: false, reason: describeError(error) };
  }

  // A package that has never been published is legitimately absent, not an
  // error — it simply means this release has not shipped it yet.
  if (response.status === 404) {
    return { name, version, ok: false, reason: "not published" };
  }
  if (!response.ok) {
    return { name, version, ok: false, reason: `registry HTTP ${response.status}` };
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    return { name, version, ok: false, reason: describeError(error) };
  }

  const present = Boolean(body?.versions?.[version]);
  return { name, version, ok: present, reason: present ? "" : `${version} not on registry` };
}

function describeError(error) {
  if (!(error instanceof Error)) return String(error);
  const code =
    error.cause && typeof error.cause === "object" && "code" in error.cause
      ? String(error.cause.code)
      : undefined;
  if (error.name === "TimeoutError") return "registry timed out";
  return code ? `${error.message} (${code})` : error.message;
}

/** Bounded-concurrency map — the registry does not enjoy 80 parallel requests. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const publishable = getReleaseSurfaceDiagnostics()
  .publishable.map(({ manifest }) => ({ name: manifest.name, version: manifest.version }))
  .sort((a, b) => a.name.localeCompare(b.name));

const checks = await mapLimit(publishable, CONCURRENCY, ({ name, version }) =>
  hasVersion(name, version),
);

const missing = checks.filter((entry) => !entry.ok);
const published = missing.length === 0 && publishable.length > 0;

for (const entry of missing.slice(0, 20)) {
  console.error(`[registry-check] ${entry.name}@${entry.version}: ${entry.reason}`);
}
if (missing.length > 20) {
  console.error(`[registry-check] ...and ${missing.length - 20} more`);
}

console.log(`published=${published}`);
console.log(`checked=${publishable.length}`);
console.log(`missing=${missing.length}`);
