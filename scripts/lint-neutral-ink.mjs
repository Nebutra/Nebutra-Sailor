#!/usr/bin/env node
/**
 * Text sits on step 11 or 12 of the neutral ramp, never 7–10.
 *
 * The ramp's jobs (CLAUDE.md): 1–2 backgrounds, 3–5 fills, 6–8 borders, 11
 * secondary text, 12 primary text. Steps 7–10 are border and solid-fill
 * steps; as ink they measure 1.1–3.6:1 on the canvas. The landing review
 * (2026-10-15) found 82 text elements under WCAG AA on /features, and the
 * largest family was `text-neutral-9` / `-10` in the feature glyphs.
 *
 * Counted per file across apps/ and packages/. SHRINK-ONLY:
 * governance.config.json → neutralInk.allowlist holds the counts that predate
 * the guard; a count may only go down and a new file starts at zero.
 * Exempt a line with `// allow-neutral-ink: <reason>` directly above it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOT = join(import.meta.dirname, "..");
const SCAN = ["apps", "packages"];
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|out|storybook-static|__tests__|coverage)(\/|$)/;
const SKIP_FILE = /(\.stories\.|\.test\.|\.spec\.)/;
const BAD = /(?<![\w-])(?:[a-z-]+:)*text-neutral-(?:7|8|9|10)(?![\w-])/g;
const ALLOW =
  JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8")).neutralInk?.allowlist ??
  {};

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIR.test(relative(ROOT, p))) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|jsx|ts)$/.test(name) && !SKIP_FILE.test(name) && !name.endsWith(".d.ts"))
      yield p;
  }
}

const counts = {};
for (const root of SCAN)
  for (const file of files(join(ROOT, root))) {
    const raw = readFileSync(file, "utf8").split("\n");
    const kept = raw.filter((_, i) => !/allow-neutral-ink:\s*\S/.test(raw[i - 1] ?? ""));
    const n = (stripComments(kept.join("\n")).match(BAD) ?? []).length;
    if (n) counts[relative(ROOT, file)] = n;
  }

if (process.argv.includes("--baseline")) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

const problems = [];
for (const [file, n] of Object.entries(counts)) {
  const cap = ALLOW[file] ?? 0;
  if (n > cap)
    problems.push(
      cap
        ? `${file}: ${n} text-neutral-7…10, allowlist says ${cap} — it may only shrink`
        : `${file}: ${n} text-neutral-7…10 — use text-neutral-11 (secondary) or text-muted-foreground`,
    );
  else if (n < cap)
    problems.push(`${file}: down to ${n} — ratchet neutralInk.allowlist from ${cap}`);
}
for (const file of Object.keys(ALLOW))
  if (!counts[file])
    problems.push(`${file}: clean or gone — delete its neutralInk.allowlist entry`);

if (problems.length) {
  console.error("❌ neutral ink — text on a border/fill step of the neutral ramp:");
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
const left = Object.values(ALLOW).reduce((s, n) => s + n, 0);
console.log(
  `✓ neutral-ink: ${Object.keys(ALLOW).length} file(s), ${left} known, 0 new. Shrink on-touch.`,
);
