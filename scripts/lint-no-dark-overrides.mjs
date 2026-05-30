#!/usr/bin/env node
// Lint guard: forbid redundant `dark:` Tailwind overrides whose underlying
// token already auto-flips via [data-theme="dark"].
//
// Bans:
//   - dark:bg-neutral-12          ← invisible-popover bug (uses TEXT color as bg)
//   - dark:<chain>:(bg|text|border|fill|stroke|divide|ring)-white(/N)?
//
// See packages/design/tokens/styles.css — neutral-* + brand scales auto-flip,
// so manual dark overrides targeting `white` or the text-neutral-12 token are
// redundant or buggy.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Scope: the directories swept by scripts/sweep-dark-overrides.mjs.
// Other apps (sailor-docs, design-docs, tsekaluk-dev, etc.) carry legacy drift
// that predates this audit and is tracked separately.
const ROOTS = ["apps/web/src", "apps/landing-page/src", "packages/design"];

const PATTERNS = [
  /\bdark:(?:[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)?:)*(?:bg|text|border|fill|stroke|divide|ring)-white(?:\/(?:\d+|\[[^\]\s"']+\]))?\b/,
  /\bdark:bg-neutral-12\b(?!\/)/,
];

const EXCLUDE_FILES = new Set([
  "scripts/sweep-dark-overrides.mjs",
  "scripts/lint-no-dark-overrides.mjs",
]);

const files = execSync(
  `find ${ROOTS.join(" ")} -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \\) -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' -not -path '*/build/*'`,
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
)
  .split("\n")
  .filter(Boolean);

const violations = [];

for (const file of files) {
  if (EXCLUDE_FILES.has(file)) continue;
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    for (const pat of PATTERNS) {
      if (pat.test(line)) {
        violations.push({ file, lineNum: idx + 1, line: line.trim().slice(0, 200) });
        break;
      }
    }
  });
}

if (violations.length > 0) {
  process.stderr.write(
    `\n✗ Found ${violations.length} redundant 'dark:' override(s).\n` +
      `  These tokens (neutral-*, white) auto-flip via [data-theme="dark"].\n` +
      `  Remove the 'dark:' variant — see packages/design/tokens/styles.css.\n\n`,
  );
  for (const v of violations.slice(0, 50)) {
    process.stderr.write(`  ${v.file}:${v.lineNum}\n    ${v.line}\n`);
  }
  if (violations.length > 50) {
    process.stderr.write(`  ... and ${violations.length - 50} more.\n`);
  }
  process.exit(1);
}

process.stdout.write(`✓ No redundant 'dark:' overrides found (scanned ${files.length} files).\n`);
