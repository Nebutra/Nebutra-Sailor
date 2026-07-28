#!/usr/bin/env node

// CI guard: ban max-w-5xl and max-w-7xl in apps/**.
//
// CLAUDE.md container contract:
//   - feature / wide chrome  → max-w-[1400px]  (var(--container-wide))
//   - pricing / architecture → max-w-6xl or max-w-[var(--container-content)]
//   - reading (hero copy, FAQ, blog, settings forms) → max-w-4xl
//
// max-w-5xl and max-w-7xl are the two values that repeatedly drift in as
// "looks fine" defaults and produce inconsistent section widths.
//
// Run: node scripts/lint-no-forbidden-containers.mjs
// Exit 1 on any violation.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BAD_RE = /\bmax-w-(?:5xl|7xl)\b/;

let filesRaw = "";
try {
  try {
    filesRaw = execSync(
      "rg -l --glob '*.{tsx,ts,jsx,js}' --glob '!**/node_modules/**' " +
        "--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
        "--glob '!**/dist/**' --glob '!**/build/**' " +
        "'max-w-(5xl|7xl)' apps",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    filesRaw = execSync(
      "grep -rlE 'max-w-(5xl|7xl)' --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' apps 2>/dev/null " +
        "| grep -v node_modules | grep -v '/.next/' | grep -v '/.open-next/' " +
        "| grep -v '/dist/' | grep -v '/build/'",
      { encoding: "utf-8" },
    ).trim();
  }
} catch {
  filesRaw = "";
}

const files = filesRaw.split("\n").filter(Boolean);
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
  process.stdout.write("✅ No forbidden max-w-5xl / max-w-7xl containers in apps/**.\n");
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} forbidden container width(s) (max-w-5xl / max-w-7xl):\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}\n    ${v.text}\n`);
}
process.stderr.write(
  "\nFix (CLAUDE.md container contract):\n" +
    "  • Feature / wide chrome / dashboard shell → max-w-[1400px]\n" +
    "  • Pricing / architecture / mid content   → max-w-6xl\n" +
    "  • Reading (blog, FAQ, settings, forms)   → max-w-4xl\n\n",
);
process.exit(1);
