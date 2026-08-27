#!/usr/bin/env node

// CI guard: fail when raw <input>/<textarea>/<select> appear in app code without
// a sanctioned opt-out.
//
// 2026 governance rule (CLAUDE.md / MEMORY.md):
//   • All form controls MUST use @nebutra/ui/primitives (<Input>, <Textarea>,
//     <Select>, <Checkbox>, <RadioGroup>).
//   • Native elements are allowed only with `data-allow-native` attribute,
//     reserved for: type="hidden" form data, type="file" with custom button
//     trigger, etc.
//   • <select> is NEVER allowed in product apps — even with data-allow-native.
//     OS chrome cannot be themed; use compound / options Select (listbox).
//     Escape hatch only with same-line or previous-line: // allow-os-select: <reason>
//
// Whitelisted areas (exempt from check):
//   • storybook/src/stories/**           — demos of native HTML behavior
//   • sailor-docs/src/components/previews/**
//                                        — registry preview demos
//   • packages/design/ui/src/primitives/** — DS wrappers (not under apps/)
//   • test files
//
// Run: node scripts/lint-no-raw-inputs.mjs
// Exit 1 on any violation. Wired into turbo lint pipeline.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WHITELIST = [
  /\/storybook\/src\/stories\//,
  /\/sailor-docs\/src\/components\/previews\//,

  /\.test\.tsx?$/,
  /\/__tests__\//,
];

const isWhitelisted = (path) => WHITELIST.some((re) => re.test(path));

// Scope: apps/ only. Package primitives (packages/design/ui/src/primitives/**) are
// by design wrappers around raw HTML and must be allowed.
const filesRaw = execSync(
  `grep -rlE '<(input|textarea|select)\\b' --include='*.tsx' apps 2>/dev/null | grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/'`,
  { encoding: "utf-8" },
).trim();
const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isWhitelisted(f));

const violations = [];
const ATTR_BODY_RE = /<(input|textarea|select)\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)\s*\/?>/gs;

// Strip JS line + block comments so commented-out tags don't false-positive.
// Keep a parallel map of allow-os-select reasons on their source lines.
const stripComments = (src) => {
  return src
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
};

/** Lines (1-indexed) that contain `// allow-os-select:` before strip. */
function allowOsSelectLines(raw) {
  const lines = new Set();
  raw.split("\n").forEach((line, i) => {
    if (/\/\/\s*allow-os-select\s*:/.test(line)) lines.add(i + 1);
  });
  return lines;
}

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const allowSelect = allowOsSelectLines(raw);
  const src = stripComments(raw);
  let lineCounter = 1;
  let cursor = 0;
  for (const match of src.matchAll(ATTR_BODY_RE)) {
    const tag = match[1];
    const attrs = match[2];
    // Compute line number
    while (cursor < match.index) {
      if (src[cursor] === "\n") lineCounter += 1;
      cursor += 1;
    }

    if (tag === "select") {
      // Product <select> banned unless // allow-os-select: on same or previous line.
      const ok = allowSelect.has(lineCounter) || allowSelect.has(lineCounter - 1);
      if (!ok) {
        violations.push({
          file,
          line: lineCounter,
          tag,
          reason: "select-banned",
        });
      }
      continue;
    }

    if (/\bdata-allow-native\b/.test(attrs)) continue;
    violations.push({ file, line: lineCounter, tag, reason: "raw" });
  }
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No raw <input>/<textarea>/<select> in app code (excluding whitelist).\n`,
  );
  process.exit(0);
}

const selectBanned = violations.filter((v) => v.reason === "select-banned");
const raw = violations.filter((v) => v.reason === "raw");

process.stderr.write(`\n❌ ${violations.length} form-control violation(s):\n\n`);
for (const v of violations) {
  const note = v.reason === "select-banned" ? "  [native <select> banned]" : "";
  process.stderr.write(`  ${v.file}:${v.line}  <${v.tag}>${note}\n`);
}
process.stderr.write(`\nFix:\n`);
process.stderr.write(`  • Visible text inputs → import { Input } from "@nebutra/ui/primitives"\n`);
process.stderr.write(
  `  • Visible textareas   → import { Textarea } from "@nebutra/ui/primitives"\n`,
);
process.stderr.write(
  `  • Visible selects     → import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nebutra/ui/primitives"\n`,
);
process.stderr.write(
  `    (options={…} API is a styled listbox by default; do NOT use raw <select>)\n`,
);
process.stderr.write(`  • Native input opt-out → data-allow-native (hidden/file only)\n`);
if (selectBanned.length) {
  process.stderr.write(
    `  • OS <select> escape  → // allow-os-select: <reason> on the line above (rare)\n`,
  );
}
process.stderr.write("\n");
process.exit(1);
