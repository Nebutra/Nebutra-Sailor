#!/usr/bin/env node

// CI guard: ban component-level Tailwind focus rings in apps/**.
//
// CLAUDE.md is explicit: do NOT add component-level focus rings. The global
// `:focus-visible` rule in packages/design/design-tokens/static/base.css already
// supplies a translucent 2px outline (hsl(var(--ring) / 0.5)) with 2px offset
// for every focusable element.
//
// Component-level `focus:ring-*` / `focus-visible:ring-*` double up on that
// outline and often reintroduce hardcoded brand-blue rings.
//
// Allowed:
//   - focus:border-* / focus-visible:border-* (mouse-focus feedback on inputs)
//   - focus:outline-none when paired with the global rule (outline is re-added
//     by :focus-visible in base.css for keyboard users)
//   - packages/** primitives that own the design-system focus treatment
//     (not scanned — apps must not re-layer rings on top)
//
// Run: node scripts/lint-no-focus-rings.mjs
// Exit 1 on any violation.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Docs / demos that intentionally illustrate wrong focus styling. */
const ALLOWLIST = [/\/accessibility-demos\.tsx$/];

const isAllowed = (path) => ALLOWLIST.some((re) => re.test(path));

const BAD_RE = /\bfocus(?:-visible)?:ring(?:-offset)?(?:-|\b)/;

let filesRaw = "";
try {
  try {
    filesRaw = execSync(
      "rg -l --glob '*.tsx' --glob '!**/node_modules/**' --glob '!**/.next/**' " +
        "--glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
        "'focus(?:-visible)?:ring-' apps",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    filesRaw = execSync(
      "grep -rlE 'focus(-visible)?:ring-' --include='*.tsx' apps 2>/dev/null " +
        "| grep -v node_modules | grep -v '/.next/' | grep -v '/.open-next/'",
      { encoding: "utf-8" },
    ).trim();
  }
} catch {
  filesRaw = "";
}

const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isAllowed(f));

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (BAD_RE.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim().slice(0, 200) });
    }
  });
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No component-level focus rings in apps/** (global :focus-visible owns the outline).\n`,
  );
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} component-level focus ring(s) — double up on the global outline:\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}\n    ${v.text}\n`);
}
process.stderr.write(
  "\nFix: remove focus:ring-* / focus-visible:ring-* / focus*:ring-offset-* classes.\n" +
    "  The global rule in packages/design/design-tokens/static/base.css already\n" +
    "  supplies a translucent 2px outline for keyboard focus.\n" +
    "  Keep focus:border-* for input mouse-focus feedback.\n\n",
);
process.exit(1);
