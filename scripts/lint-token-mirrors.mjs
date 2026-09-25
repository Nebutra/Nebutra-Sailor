#!/usr/bin/env node
/**
 * A token value is written once. Everything else reads it.
 *
 * The token source is packages/design/design-tokens/tokens/*.json; it builds
 * styles.css, which apps render with, and @nebutra/tokens/values, which code
 * that cannot read CSS (Storybook text, docs demos, OG images, PDFs) reads.
 * A file that spells the values out again — a font stack pasted into
 * primitive.ts, a palette pasted into an override sheet — is a mirror: it
 * shows one thing while the apps render another the day the source changes,
 * and a verifier that keeps the two in step only moves the drift into CI.
 *
 * A file fails when it restates THRESHOLD or more distinct token values (hex
 * colours the stylesheet defines, and font stacks — two concrete families of a
 * token stack, adjacent). One stray hex is lint-no-brand-hex's business; three
 * is a copy.
 *
 * governance.config.json → tokenMirrors:
 *   sources    — files where the values are legitimately authored or matched
 *                (the colour seed, the pipeline, other design languages'
 *                presets, the guards themselves). Each carries its reason.
 *   allowlist  — mirrors that predate this guard, with their count. Shrink-only:
 *                a count may only go down, an entry that drops below the
 *                threshold must be deleted, and a new mirror fails.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { extractValues } from "../packages/design/tokens/scripts/emit-values.mjs";

const ROOT = join(import.meta.dirname, "..");
const config = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8")).tokenMirrors;
const THRESHOLD = config.threshold;
const SOURCES = config.sources;
const ALLOWLIST = config.allowlist;

const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.open-next|\.turbo|storybook-static|coverage|__tests__)(\/|$)/;
const SKIP_FILE = /(\.test\.|\.spec\.|\.generated\.|\.d\.ts$)/;
const SKIP_PATH = /^packages\/design\/(tokens\/(styles\.css|skins\/)|theme\/skins\.css)/;

// ── the values, parsed out of the stylesheet apps import ─────────────────────
// Same parser as @nebutra/tokens/values (emit-values.mjs), run on styles.css
// itself — never a regex over the formatted TS, whose layout Biome owns.
const values = extractValues(readFileSync(join(ROOT, "packages/design/tokens/styles.css"), "utf8"));
const GENERIC = new Set(["#ffffff", "#000000"]);
const hexes = new Set();
for (const modes of values.values()) {
  for (const value of Object.values(modes)) {
    for (const m of value.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const h = m[0].toLowerCase();
      if (!GENERIC.has(h)) hexes.add(h);
    }
  }
}
const SYSTEM =
  /^(-apple-system|BlinkMacSystemFont|system-ui|ui-monospace|ui-sans-serif|SFMono-Regular|Menlo|monospace|sans-serif|serif|Segoe UI|Roboto|Helvetica|Arial)$/;
const stackPairs = new Set();
for (const [name, modes] of values) {
  if (!name.startsWith("--font-") || !modes.light) continue;
  const families = modes.light
    .replace(/var\(--[\w-]+(?:,\s*("[^"]+"))?\)/g, (_, fb) => fb ?? "")
    .split(",")
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f && !SYSTEM.test(f));
  for (let i = 0; i + 1 < families.length; i++) stackPairs.add(`${families[i]}|${families[i + 1]}`);
}
if (hexes.size === 0 || stackPairs.size === 0) {
  // A guard reading zero values reports clean on everything — fail loudly instead.
  console.error(
    `❌ token-mirrors read ${hexes.size} colours and ${stackPairs.size} font pairs from styles.css`,
  );
  process.exit(1);
}

function count(text) {
  const found = new Set();
  for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const h = m[0].toLowerCase();
    if (hexes.has(h)) found.add(h);
  }
  const normal = text.replace(/'/g, '"');
  for (const pair of stackPairs) {
    const [a, b] = pair.split("|");
    if (new RegExp(`"${a}"\\s*,\\s*"${b}"`).test(normal)) found.add(`font:${pair}`);
  }
  return found.size;
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p);
    if (SKIP_DIR.test(rel)) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|jsx?|mjs|css)$/.test(name) && !SKIP_FILE.test(name) && !SKIP_PATH.test(rel))
      yield rel;
  }
}

const problems = [];
const seen = new Set();
const seenSources = new Set();
for (const base of ["apps", "packages", "scripts"]) {
  for (const rel of files(join(ROOT, base))) {
    const n = count(readFileSync(join(ROOT, rel), "utf8"));
    if (rel in SOURCES) {
      seenSources.add(rel);
      // A declared source that no longer restates anything is a stale exemption.
      if (n < THRESHOLD && !rel.startsWith("scripts/lint-"))
        problems.push(
          `${rel}: declared a source but restates ${n} — delete its tokenMirrors.sources entry`,
        );
      continue;
    }
    const allowed = ALLOWLIST[rel];
    if (allowed !== undefined) seen.add(rel);
    if (n < THRESHOLD) {
      if (allowed !== undefined)
        problems.push(
          `${rel}: no longer a mirror (${n}) — delete its tokenMirrors.allowlist entry`,
        );
      continue;
    }
    if (allowed === undefined)
      problems.push(
        `${rel}: restates ${n} token values — read them from @nebutra/tokens/values or var()`,
      );
    else if (n > allowed)
      problems.push(`${rel}: ${n} token values, allowlist says ${allowed} — it may only shrink`);
    else if (n < allowed)
      problems.push(`${rel}: down to ${n} — ratchet its allowlist entry from ${allowed} to ${n}`);
  }
}
for (const rel of Object.keys(SOURCES)) {
  if (!seenSources.has(rel)) problems.push(`${rel}: declared a source but gone — delete the entry`);
}
for (const rel of Object.keys(ALLOWLIST)) {
  if (!seen.has(rel)) problems.push(`${rel}: allowlisted but gone — delete the entry`);
}

if (problems.length) {
  console.error(
    "❌ token mirrors — a value is written once in the token source; everything else reads it:",
  );
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
console.log(
  `✓ token-mirrors: ${Object.keys(ALLOWLIST).length} known mirror(s), 0 new. Migrate on-touch to shrink the list.`,
);
