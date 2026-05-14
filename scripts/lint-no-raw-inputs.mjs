#!/usr/bin/env node

// CI guard: fail when raw <input>/<textarea>/<select> appear in app code without
// `data-allow-native` opt-out.
//
// 2026 governance rule (CLAUDE.md / MEMORY.md):
//   • All form controls MUST use @nebutra/ui/primitives (<Input>, <Textarea>,
//     <Select>, <Checkbox>, <RadioGroup>).
//   • Native elements are allowed only with `data-allow-native` attribute,
//     reserved for: type="hidden" form data, type="file" with custom button
//     trigger, special filter selects requiring empty-string semantics, etc.
//
// Whitelisted areas (exempt from check):
//   • storybook/src/stories/**           — demos of native HTML behavior
//   • design-docs/src/components/previews/**, sailor-docs/src/components/previews/**
//                                        — registry preview demos
//   • apps/tsekaluk-dev/src/components/ui/** — independent app's own primitives
//   • test files
//
// Run: node scripts/lint-no-raw-inputs.mjs
// Exit 1 on any violation. Wired into turbo lint pipeline.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WHITELIST = [
  /\/storybook\/src\/stories\//,
  /\/design-docs\/src\/components\/previews\//,
  /\/sailor-docs\/src\/components\/previews\//,
  /\/tsekaluk-dev\/src\/components\/ui\//,
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
// Replace each comment with same-length whitespace to preserve byte offsets / line numbers.
const stripComments = (src) => {
  return src
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
};

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const src = stripComments(raw);
  let lineCounter = 1;
  let cursor = 0;
  for (const match of src.matchAll(ATTR_BODY_RE)) {
    const attrs = match[2];
    if (/\bdata-allow-native\b/.test(attrs)) continue;
    // Compute line number
    while (cursor < match.index) {
      if (src[cursor] === "\n") lineCounter += 1;
      cursor += 1;
    }
    violations.push({ file, line: lineCounter, tag: match[1] });
  }
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No raw <input>/<textarea>/<select> in app code (excluding whitelist).\n`,
  );
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} raw form-control violation(s) — must use @nebutra/ui/primitives or add data-allow-native:\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}  <${v.tag}>\n`);
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
  `  • Native opt-out      → add \`data-allow-native\` attribute (for type="hidden", type="file" with custom trigger, etc.)\n\n`,
);
process.exit(1);
