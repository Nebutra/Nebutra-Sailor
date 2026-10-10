#!/usr/bin/env node

// CI guard: clipboard writes go through useCopyToClipboard / CopyButton.
//
// A raw navigator.clipboard.writeText() call is how 16 forge copy buttons
// shipped with no feedback at all, and how the rest reported "Copied" even
// when the write was refused (no user gesture, insecure context, permission
// policy). useCopyToClipboard owns the held copied/failed state, the polite
// live-region announcement, the optional toast and the failure path.
//
// SHRINK-ONLY ratchet (governance.config.json → rawClipboardWrites.allowlist);
// see scripts/lib/jsx-count-ratchet.mjs. Scope: apps/** and packages/design/**
// .ts and .tsx; the hook's own file is exempt.
//
// Run: node scripts/lint-no-raw-clipboard.mjs

import { listSourceFiles, runCountRatchet, sourceFor } from "./lib/jsx-count-ratchet.mjs";

const OWNER = "packages/design/ui/src/primitives/copy-button.tsx";

runCountRatchet({
  key: "rawClipboardWrites",
  what: "raw clipboard.writeText calls",
  files: listSourceFiles(["apps", "packages/design"], { extensions: [".ts", ".tsx"] }),
  count(file) {
    if (file === OWNER) return 0;
    return (sourceFor(file).match(/\bclipboard\s*\.\s*writeText\s*\(/g) ?? []).length;
  },
  fix: [
    '  • Buttons → <CopyButton value label copiedLabel /> from "@nebutra/ui/primitives"',
    '  • Custom UI → const { copy, copied, failed } = useCopyToClipboard() from "@nebutra/ui/primitives"',
    "  • Menus → <CopyMenuItem value>…</CopyMenuItem>",
  ].join("\n"),
});
