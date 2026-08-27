#!/usr/bin/env node

// CI guard: lucide-react is deprecated. Zero new (and zero remaining) imports.
//
// 2026 icon governance (CLAUDE.md) — three-tier hierarchy:
//   1. @nebutra/icons (Geist 541) — DEFAULT for product/app/dashboard
//   2. @phosphor-icons/react — marketing surfaces only (see lint-phosphor-marketing-only)
//   3. lucide-react — REMOVED. Import statements fail this guard.
//
// Prose mentions of the package name (e.g. "do not use lucide-react") are fine.
// Only real import/require statements are banned.
//
// Intentional anti-examples in docs that demonstrate the ban may be allowlisted
// below — they must keep showing the BAD form so readers learn the rule.
//
// Run: node scripts/lint-no-lucide.mjs
// Exit 1 on any lucide-react import outside the allowlist.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Paths that intentionally show a BAD `from "lucide-react"` anti-example. */
const ALLOWLIST = new Set([
  "apps/sailor-docs/content/docs/en/customization/linting-rules.mdx",
  "apps/sailor-docs/content/docs/zh/customization/linting-rules.mdx",
]);

const IMPORT_RE = /(?:from\s+['"]lucide-react['"]|require\s*\(\s*['"]lucide-react['"]\s*\))/;

let filesRaw = "";
try {
  // Prefer rg when available — respects ignore files and is faster on monorepos.
  // Fallback to grep with explicit build-artifact exclusions.
  try {
    filesRaw = execSync(
      "rg -l --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/.open-next/**' " +
        "--glob '!**/.turbo/**' --glob '!**/dist/**' --glob '!**/build/**' " +
        "--glob '**/*.{ts,tsx,js,jsx,mjs,cjs,md,mdx}' " +
        "from\\s+['\\\"]lucide-react['\\\"]|require\\s*\\(\\s*['\\\"]lucide-react['\\\"]" +
        " apps packages 2>/dev/null",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    filesRaw = execSync(
      'grep -rlE "from[[:space:]]*[\'\\"]lucide-react[\'\\"]|require[[:space:]]*\\\\([[:space:]]*[\'\\"]lucide-react[\'\\"]" ' +
        "--include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' " +
        "--include='*.mjs' --include='*.cjs' --include='*.md' --include='*.mdx' " +
        "apps packages 2>/dev/null " +
        "| grep -v node_modules | grep -v dist/ | grep -v build/ " +
        "| grep -v '/.next/' | grep -v '/.open-next/' | grep -v '/.turbo/'",
      { encoding: "utf-8" },
    ).trim();
  }
} catch {
  // grep/rg exits non-zero when zero matches — clean pass.
  filesRaw = "";
}

const files = filesRaw.split("\n").filter(Boolean);

const violations = [];
for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (IMPORT_RE.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim().slice(0, 200) });
    }
  });
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No lucide-react imports found (scanned ${files.length} candidate file(s); ${ALLOWLIST.size} anti-example(s) allowlisted).\n`,
  );
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} lucide-react import(s) — package is deprecated:\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}  ${v.text}\n`);
}
process.stderr.write(
  "\nFix:\n" +
    '  • Replace with import { … } from "@nebutra/icons" (Geist).\n' +
    "  • Name mapping lives in scripts/migrate-lucide-to-geist.mjs (MAP).\n" +
    "  • Marketing-only thin weight: @phosphor-icons (lint-phosphor-marketing-only).\n" +
    "  • Do not re-add lucide-react as a dependency.\n\n",
);
process.exit(1);
