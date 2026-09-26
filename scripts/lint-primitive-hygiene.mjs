#!/usr/bin/env node
/**
 * Source components speak the design system, not a palette of their own.
 *
 * The theme playground's black checkbox came from a primitive that kept the
 * palette of the library it was copied from (Geist's gray-1000), so it stayed
 * black under every Brand Package. An audit of packages/design/ui on
 * 2026-09-25 found the same shape across the library: 480 raw-palette classes
 * in 44 files and 70 English aria-label literals in 43 files.
 *
 * Two families, counted per file under packages/design/ui/src:
 *   palette — Tailwind default-palette or fixed colour classes: bg-gray-500,
 *             text-white, border-black, fill-geist-gray-1000 … A component
 *             should say what the colour IS (bg-muted, text-foreground,
 *             border-border, bg-primary) so a Brand Package can answer.
 *             The 12-step scales (bg-neutral-3, text-blue-11) are tokens and
 *             are fine: Tailwind's default steps are 50/100…900/950, the token
 *             steps 1–12, so the two never collide.
 *   aria    — an aria-label spelled as an English literal. A shared component
 *             cannot know the product's language; take it as a prop (with the
 *             English default in the signature) so a caller can translate it.
 *
 * Exempt one line with `// allow-palette: <reason>` directly above it — for
 * colour on arbitrary media (video controls) or depicted third-party chrome.
 *
 * governance.config.json → primitiveHygiene.allowlist holds the counts that
 * predate this guard. Shrink-only: a count may only go down, a file that gets
 * to zero must leave the list, and a new file must start at zero.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { stripComments as blankSourceComments } from "./lib/strip-comments.mjs";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "packages/design/ui/src");
const ALLOW = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8"))
  .primitiveHygiene.allowlist;

const PALETTE =
  /\b(?:bg|text|border|fill|stroke|ring|from|to|via|outline|divide|shadow|placeholder|caret|accent|decoration)-(?:(?:gray|zinc|slate|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)|white|black|geist-[\w-]+)\b/g;
const ARIA = /aria-label(?:=|:)\s*(?:\{\s*)?["'`]([A-Za-z][^"'`{}]{2,})["'`]/g;
// A prop named onChange that receives a value, not an event. Base UI and the
// DOM use onChange for events; value callbacks are onValueChange /
// onCheckedChange. The 2026-09-25 migration kept each legacy onChange as a
// deprecated alias — a line whose previous line says @deprecated is exempt.
const VALUE_ONCHANGE =
  /^\s*onChange\??\s*:\s*\(\s*(?!e\b|event\b|ev\b)\w+\s*:\s*(?!React\.)[\w[\]| ]+\)\s*=>/;

function strip(src) {
  return blankSourceComments(src);
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (/(__tests__|\/test$)/.test(p)) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(name) && !/\.(stories|test)\./.test(name)) yield p;
  }
}

const problems = [];
const seen = new Set();
for (const file of files(SRC)) {
  const rel = relative(ROOT, file);
  // A line may be exempted by `allow-palette: <reason>` on the line above it
  // (colour that sits on arbitrary media, or depicts third-party chrome such
  // as a macOS window's traffic lights). The reason is required.
  const raw = readFileSync(file, "utf8").split("\n");
  const keptPalette = raw.filter((_, i) => !/allow-palette:\s*\S/.test(raw[i - 1] ?? ""));
  // `allow-aria-literal: <reason>` does the same for a label that is not copy
  // — a brand or product name, which no locale translates.
  const keptAria = raw.filter((_, i) => !/allow-aria-literal:\s*\S/.test(raw[i - 1] ?? ""));
  const code = strip(keptPalette.join("\n"));
  const ariaCode = strip(keptAria.join("\n"));
  const counts = {
    onchange: raw.filter(
      (line, i) => VALUE_ONCHANGE.test(line) && !/@deprecated/.test(raw[i - 1] ?? ""),
    ).length,
    palette: (code.match(PALETTE) ?? []).length,
    aria: [...ariaCode.matchAll(ARIA)].length,
  };
  const allowed = ALLOW[rel];
  if (allowed) seen.add(rel);
  for (const kind of ["palette", "aria", "onchange"]) {
    const n = counts[kind];
    const cap = allowed?.[kind] ?? 0;
    if (n > cap) {
      problems.push(
        cap === 0
          ? `${rel}: ${n} ${kind} violation(s) — ${
              {
                palette: "use semantic tokens (bg-muted, text-foreground, bg-primary…)",
                aria: "take the label as a prop with an English default",
                onchange: "name a value callback onValueChange / onCheckedChange",
              }[kind]
            }`
          : `${rel}: ${kind} ${n}, allowlist says ${cap} — it may only shrink`,
      );
    } else if (allowed && n < cap) {
      problems.push(
        `${rel}: ${kind} down to ${n} — ratchet its allowlist entry from ${cap} to ${n}`,
      );
    }
  }
  if (allowed && counts.palette === 0 && counts.aria === 0 && counts.onchange === 0)
    problems.push(`${rel}: clean — delete its primitiveHygiene.allowlist entry`);
}
for (const rel of Object.keys(ALLOW)) {
  if (!seen.has(rel)) problems.push(`${rel}: allowlisted but gone — delete the entry`);
}

if (problems.length) {
  console.error("❌ primitive hygiene — source components use the design system's words:");
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
const left = Object.values(ALLOW).reduce(
  (s, c) => s + (c.palette ?? 0) + (c.aria ?? 0) + (c.onchange ?? 0),
  0,
);
console.log(
  `✓ primitive-hygiene: ${Object.keys(ALLOW).length} file(s), ${left} known violation(s), 0 new. Shrink on-touch.`,
);
