#!/usr/bin/env node

// CI guard: no `title=` attribute used as a tooltip on intrinsic elements.
//
// The native title tooltip appears only after a long hover, never on keyboard
// focus or touch, is unreliable in screen readers, and cannot be styled
// (MDN: title attribute, accessibility concerns). Worst of all it is used as
// the only explanation of why a control is disabled. Use Tooltip (keyboard and
// touch reachable, delay-grouped), visible helper text, or MiddleTruncate for
// truncation reveal.
//
// Counted: `title=` on a lowercase JSX element. Not counted: components
// (`<Card title=…>` is a prop), and elements where title is semantic —
// <iframe> (accessible name), <abbr>/<dfn> (expansion), <link>/<style>/<meta>
// and SVG <title>/<svg>.
//
// SHRINK-ONLY ratchet (governance.config.json → titleTooltips.allowlist); see
// scripts/lib/jsx-count-ratchet.mjs. Scope: apps/** and packages/design/**.
//
// Run: node scripts/lint-no-title-tooltips.mjs

import {
  openingTags,
  runCountRatchet,
  sourceFor,
  topLevelAttributes,
} from "./lib/jsx-count-ratchet.mjs";

const SEMANTIC_TITLE = new Set(["iframe", "abbr", "dfn", "link", "style", "meta", "svg", "title"]);

runCountRatchet({
  key: "titleTooltips",
  what: "title= tooltips",
  roots: ["apps", "packages/design"],
  count(file) {
    let n = 0;
    for (const { tag, attrs } of openingTags(sourceFor(file))) {
      if (!/^[a-z]/.test(tag) || tag.includes(".") || SEMANTIC_TITLE.has(tag)) continue;
      if (/(?:^|\s)title\s*=/.test(topLevelAttributes(attrs))) n++;
    }
    return n;
  },
  fix: [
    "  • Explanations → <Tooltip><TooltipTrigger>…</TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>",
    "  • Disabled reasons → visible helper text next to the control (aria-describedby)",
    '  • Truncated text → <MiddleTruncate> from "@nebutra/ui/primitives"',
  ].join("\n"),
});
