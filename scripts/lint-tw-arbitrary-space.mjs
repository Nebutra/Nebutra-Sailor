#!/usr/bin/env node
/**
 * A Tailwind arbitrary value may not contain a raw space.
 *
 * A class list is split on whitespace before Tailwind ever sees it, so
 * `bg-[var(--color-success, var(--color-green-500))]` is two classes —
 * `bg-[var(--color-success,` and `var(--color-green-500))]` — and neither
 * generates CSS. No error, no warning: the element simply has no fill. On
 * 2026-10-10 this left the success, info and warning Alerts with no background
 * (solid) and no colour (outline) — twelve dead classes in one file. Write the
 * space as `_` (Tailwind's escape) or drop it: `bg-[var(--a,var(--b))]`.
 *
 * Scope: packages/design (the component library and its tokens). Zero
 * baseline — there is no allowlist.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOT = join(import.meta.dirname, "..");
const SCAN = ["packages/design"];
// utility-[...whitespace...] inside one string literal, where the bracket opens
// right after a utility prefix and closes later on the same line.
const BAD = /(?<![\w-])(?:[a-z][\w-]*:)*-?[a-z][\w-]*-\[[^\]\s"'`]*\s[^\]"'`\n]*\]/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".turbo", ".next"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|mjs)$/.test(name) && !/\.d\.ts$/.test(name)) yield p;
  }
}

const problems = [];
for (const root of SCAN)
  for (const file of walk(join(ROOT, root))) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const m of code.matchAll(BAD)) {
      // Only inside a string literal that looks like a class list.
      const line = code.slice(code.lastIndexOf("\n", m.index) + 1, code.indexOf("\n", m.index));
      if (!/["'`]/.test(line)) continue;
      problems.push(`${relative(ROOT, file)}: "${m[0]}"`);
    }
  }

if (problems.length) {
  console.error(
    "❌ tailwind arbitrary value with a raw space — the class splits and both halves are dead:",
  );
  for (const p of problems) console.error(`   ${p}`);
  console.error("   Use _ for the space, or remove it: bg-[var(--a,var(--b))]");
  process.exit(1);
}
console.log("✓ tw-arbitrary-space: 0 split arbitrary values in packages/design.");
