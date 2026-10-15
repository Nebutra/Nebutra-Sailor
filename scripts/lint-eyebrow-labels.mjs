#!/usr/bin/env node

// CI guard: no mono / tracked uppercase micro-labels on the marketing site.
//
// The site DESIGN.md (apps/landing/src/nebutra), "No AI look": no mono uppercase
// micro-labels everywhere. The 2026-10-10 landing review counted 154 class
// strings that set `uppercase` together with letter-spacing or the mono face
// ("CHAPTER I · STRATEGIC POSITION", "CORE OBJECTIVES", "01 / 03") — the same
// defect the design-site benchmark removed from the design site. Vercel,
// Linear and Cursor label in sentence case, in the sans, at text-sm.
//
// Counted: a string literal in a .tsx file under apps/landing/src that
// contains the class `uppercase` and also `font-mono` or a `tracking-*` class.
// Code itself (a mono, non-uppercase string) is not counted.
//
// SHRINK-ONLY ratchet (governance.config.json → eyebrowLabels.allowlist); see
// scripts/lib/jsx-count-ratchet.mjs.
//
// Run: node scripts/lint-eyebrow-labels.mjs

import { runCountRatchet, sourceFor } from "./lib/jsx-count-ratchet.mjs";

const STRING = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;

runCountRatchet({
  key: "eyebrowLabels",
  what: "mono/tracked uppercase labels",
  roots: ["apps/landing/src"],
  count(file) {
    let n = 0;
    for (const m of sourceFor(file).matchAll(STRING)) {
      const classes = (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/);
      if (!classes.includes("uppercase")) continue;
      if (classes.some((c) => c === "font-mono" || /^(?:[a-z]+:)*tracking-/.test(c))) n++;
    }
    return n;
  },
  fix: [
    "  • Label in sentence case, in the sans: text-sm text-muted-foreground (no uppercase, no tracking, no font-mono)",
    "  • Mono is for code and versions only; a label is not code",
  ].join("\n"),
});
