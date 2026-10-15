#!/usr/bin/env node

// CI guard: apps/router paints with tokens, never with colour literals.
//
// Router shipped with no dark mode for months because its market shell and
// cards were painted with literals — #f5f6fa canvases, bg-white logo plates,
// rgb(15 23 42 / …) shadows. A literal has one value; a token has one per
// theme. Light and dark captures were pixel-identical, and nothing failed.
//
// Counted per file (.ts / .tsx / .css under apps/router/src, tests excluded):
//   • hex colour literals            #fff  #f5f6fa  #0f172a80
//   • functional literals            rgb(…) rgba(…) hsl(…) hsla(…) with a number
//                                    first — hsl(var(--x)) is a token, not a literal
//   • the white / black keywords     inside color-mix() / gradients
//   • literal Tailwind palettes      bg-white  text-black  ring-black/5
//                                    border-gray-200  text-slate-500 …
//
// Use instead: semantic utilities (bg-card, text-muted-foreground, border-border),
// the 12-step scales (bg-neutral-2), hsl(var(--x)) in raw colour slots, and the
// shadow ramp (shadow-ambient-sm|md|lg, shadow-glass-*). CLAUDE.md → Token
// Governance.
//
// Third-party marks drawn in their own registered colours (payment-network
// logos, vendor wordmarks) carry `@allow-raw-color: <reason>` on the line or
// the line above. SHRINK-ONLY ratchet: governance.config.json →
// routerRawColors.allowlist (see scripts/lib/jsx-count-ratchet.mjs).
//
// Run: node scripts/lint-router-raw-colors.mjs

import { readFileSync } from "node:fs";
import { listSourceFiles, runCountRatchet } from "./lib/jsx-count-ratchet.mjs";

const PATTERNS = [
  /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g,
  /(?<![a-zA-Z-])(?:rgba?|hsla?)\(\s*[\d.]/g,
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|divide|decoration|placeholder|caret|accent)-(?:white|black|gray|slate|zinc|stone)\b/g,
  /[\s,(]\b(?:white|black)\b\s*(?:\d+%)?\s*[,)]/g,
];

const ESCAPE = "@allow-raw-color";

function countFile(file) {
  const lines = readFileSync(file, "utf-8").split("\n");
  let n = 0;
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes(ESCAPE) || (i > 0 && lines[i - 1].includes(ESCAPE))) continue;
    // Drop comments: block comments may span lines; `//` only outside URLs.
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    line = line.replace(/\/\*.*?\*\//g, "");
    const open = line.indexOf("/*");
    if (open !== -1) {
      line = line.slice(0, open);
      inBlock = true;
    }
    line = line.replace(/(^|[^:"'])\/\/.*$/, "$1");
    if (/^\s*\*/.test(line)) continue;
    for (const re of PATTERNS) n += (line.match(re) ?? []).length;
  }
  return n;
}

runCountRatchet({
  key: "routerRawColors",
  what: "raw colour literals in apps/router",
  files: listSourceFiles(["apps/router/src"], { extensions: [".ts", ".tsx", ".css"] }),
  count: countFile,
  fix: [
    "  • Surfaces → bg-card / bg-background / bg-neutral-N; text → text-foreground / text-muted-foreground",
    "  • Raw colour slots (SVG fill, color-mix, gradients) → hsl(var(--x)) or var(--neutral-N)",
    "  • Shadows → shadow-ambient-sm|md|lg / shadow-glass-* (each has a real dark value)",
    "  • Third-party brand marks in registered colours → // @allow-raw-color: <reason>",
  ].join("\n"),
});
