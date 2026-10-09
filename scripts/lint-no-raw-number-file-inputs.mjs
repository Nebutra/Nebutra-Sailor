#!/usr/bin/env node

// CI guard: no raw number or file inputs outside the primitives that own them.
//
// `<input type="number">` / `<Input type="number">` ships OS spin buttons that
// cannot be themed, wheel-to-change that edits a value the user was scrolling
// past, and accepts "e" and "+" mid-string. Use NumberField (Base UI
// NumberField) from @nebutra/ui/primitives.
//
// `<input type="file">` renders the unstyled OS "Choose file" control unless
// every caller rebuilds drag-and-drop, validation and the focus ring around a
// hidden input. Use Dropzone from @nebutra/ui/primitives.
//
// SHRINK-ONLY ratchet (governance.config.json → rawNumberFileInputs.allowlist);
// see scripts/lib/jsx-count-ratchet.mjs for the contract. Scope: apps/** and
// packages/design/**, tests excluded. The primitive that implements the file
// control is exempt.
//
// Run: node scripts/lint-no-raw-number-file-inputs.mjs

import {
  openingTags,
  runCountRatchet,
  sourceFor,
  topLevelAttributes,
} from "./lib/jsx-count-ratchet.mjs";

const OWNERS = new Set(["packages/design/ui/src/primitives/dropzone.tsx"]);
const TYPE_RE =
  /\btype\s*=\s*(?:"(?:number|file)"|'(?:number|file)'|\{\s*["'`](?:number|file)["'`]\s*\})/;

runCountRatchet({
  key: "rawNumberFileInputs",
  what: 'raw <input type="number|file">',
  roots: ["apps", "packages/design"],
  count(file) {
    if (OWNERS.has(file)) return 0;
    let n = 0;
    for (const { tag, attrs } of openingTags(sourceFor(file))) {
      if (tag !== "input" && tag !== "Input") continue;
      if (TYPE_RE.test(topLevelAttributes(attrs))) n++;
    }
    return n;
  },
  fix: [
    '  • Numbers → <NumberField label id value onValueChange min max step /> from "@nebutra/ui/primitives"',
    '  • Files   → <Dropzone accept maxSize onFiles /> from "@nebutra/ui/primitives"',
  ].join("\n"),
});
