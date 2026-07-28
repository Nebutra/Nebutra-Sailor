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

/**
 * Scanned trees. `packages/design` joined on 2026-07-28: the library shipped
 * both forbidden widths in 24 places — including its own container scales in
 * tokens/spacing.ts and layouts/SectionContainer.tsx — while app code had none.
 * A width baked into a DS section container reaches every page that uses it.
 */
const SCAN_ROOTS = ["apps", "packages/design"];

/**
 * Files that legitimately contain the forbidden strings because they *state the
 * rule* rather than apply it: the design-sync prose that tells a design tool
 * what not to emit, and the test asserting that prose.
 */
const ALLOWLIST = [/\/serialize\/to-design-md\.prose\.ts$/, /\/__tests__\/to-design-md\.test\.ts$/];

const BAD_RE = /\bmax-w-(?:5xl|7xl)\b/;

/** Line comments and JSDoc/block-comment bodies. */
const COMMENT_RE = /^\s*(?:\/\/|\/\*|\*)/;

let filesRaw = "";
try {
  try {
    filesRaw = execSync(
      "rg -l --glob '*.{tsx,ts,jsx,js}' --glob '!**/node_modules/**' " +
        "--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
        "--glob '!**/dist/**' --glob '!**/build/**' " +
        `'max-w-(5xl|7xl)' ${SCAN_ROOTS.join(" ")}`,
      { encoding: "utf-8" },
    ).trim();
  } catch {
    filesRaw = execSync(
      "grep -rlE 'max-w-(5xl|7xl)' --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' " +
        `${SCAN_ROOTS.join(" ")} 2>/dev/null ` +
        "| grep -v node_modules | grep -v '/.next/' | grep -v '/.open-next/' " +
        "| grep -v '/dist/' | grep -v '/build/'",
      { encoding: "utf-8" },
    ).trim();
  }
} catch {
  filesRaw = "";
}

const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !ALLOWLIST.some((re) => re.test(f)));
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    // Skip comment lines. A migration note that names the forbidden width in
    // order to explain what it replaced is documentation, not a violation —
    // flagging it teaches people to delete the explanation.
    if (COMMENT_RE.test(line)) return;
    if (BAD_RE.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim().slice(0, 200) });
    }
  });
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No forbidden max-w-5xl / max-w-7xl containers in ${SCAN_ROOTS.map((r) => `${r}/**`).join(" + ")}.\n`,
  );
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
