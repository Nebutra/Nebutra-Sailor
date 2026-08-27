#!/usr/bin/env node

// CI guard: fail when raw <input>/<textarea>/<select> appear in app code
// without a `data-allow-native` opt-out.
//
// Governance rule:
//   • All form controls MUST use the project's UI primitives package
//     (configurable via governance.config.json → rawInputs.primitivesImport;
//     defaults to @nebutra/ui/primitives).
//   • Native elements are allowed only with the `data-allow-native` attribute,
//     reserved for: type="hidden" form data, type="file" with a custom button
//     trigger, special filter selects requiring empty-string semantics, etc.
//
// Config (governance.config.json → rawInputs), all optional with defaults:
//   • scanRoots       — directories to scan          (default ["apps"])
//   • primitivesImport— UI primitives package        (default @nebutra/ui/primitives)
//   • whitelist       — regex strings, exempt paths  (default stories + tests)
//
// This generalized version is config-driven and ships into scaffolded projects.
// It hardcodes NO monorepo paths.
//
// Run: node scripts/governance/lint-no-raw-inputs.mjs
// Exit 1 on any violation. Wired into the project's `lint` pipeline.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { config } from "./_config.mjs";

const { scanRoots, primitivesImport, whitelist } = config.rawInputs;

const WHITELIST = whitelist.map((pattern) => new RegExp(pattern));
const isWhitelisted = (path) => WHITELIST.some((re) => re.test(path));

// Scope: scanRoots only (default apps/). Package primitives are by design
// wrappers around raw HTML and live outside the scanned roots, so they are
// never flagged.
const roots = scanRoots.join(" ");
const grepOut = execSync(
  `grep -rlE '<(input|textarea|select)\\b' --include='*.tsx' ${roots} 2>/dev/null | grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/' || true`,
  { encoding: "utf-8" },
).trim();

const files = grepOut
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isWhitelisted(f));

const violations = [];
const ATTR_BODY_RE = /<(input|textarea|select)\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)\s*\/?>/gs;

// Strip JS line + block comments so commented-out tags don't false-positive.
// Replace each comment with same-length whitespace to preserve byte offsets /
// line numbers.
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
  `\n❌ ${violations.length} raw form-control violation(s) — must use ${primitivesImport} or add data-allow-native:\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}  <${v.tag}>\n`);
}
process.stderr.write(`\nFix:\n`);
process.stderr.write(`  • Visible text inputs → import { Input } from "${primitivesImport}"\n`);
process.stderr.write(`  • Visible textareas   → import { Textarea } from "${primitivesImport}"\n`);
process.stderr.write(
  `  • Visible selects     → import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "${primitivesImport}"\n`,
);
process.stderr.write(
  `  • Native opt-out      → add \`data-allow-native\` attribute (for type="hidden", type="file" with custom trigger, etc.)\n\n`,
);
process.exit(1);
