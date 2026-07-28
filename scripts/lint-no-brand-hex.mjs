#!/usr/bin/env node

// CI guard: ban hardcoded brand/status hex in apps/** runtime UI.
//
// Canonical tokens (CLAUDE.md):
//   #0033FE → var(--brand-primary)
//   #0BF1C3 → var(--brand-accent)
//   #8b5cf6 → var(--brand-tertiary)
//   #ef4444 → var(--status-danger)
//   #f59e0b → var(--status-warning)
//   #10b981 → var(--status-success)
//
// Hardcoded hex escapes theming and white-label: the palette changes, these do not.
//
// Legitimate exceptions (allowlisted by path or line marker):
//   - SVG brand assets (vector fills must be concrete)
//   - Email HTML (clients lack CSS variables)
//   - Color-picker / forge tooling whose domain IS hex input
//   - Theme playground placeholders and docs demos that *show* the hex
//   - global-error.tsx (renders outside root layout; no CSS vars)
//   - Line comment: // @allow-brand-hex: <reason>
//
// Run: node scripts/lint-no-brand-hex.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const HEX_RE =
  /#(?:0033[Ff][Ee]|0[Bb][Ff]1[Cc]3|8[Bb]5[Cc][Ff]6|[Ee][Ff]4444|[Ff]59[Ee]0[Bb]|10[Bb]981)\b/;

const ALLOW_PATH = [
  /\.svg$/i,
  /\/public\//,
  /global-error\.tsx$/,
  /mail-preview\/scripts\/export\.ts$/,
  /\/api\/og\//,
  /\/api\/changelog\/webhook\//, // email HTML body
  /appearance\/(?:color-picker-row|accent-swatch-picker)\.tsx$/,
  /forge\/src\/components\/(?:catalog-runners|p0-runners)\.tsx$/,
  /theme-playground\//,
  /grain-gradient-background-demo\.tsx$/,
  /__tests__\//,
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /content\/docs\//, // mdx token docs may print the literal
];

const isAllowedPath = (p) => ALLOW_PATH.some((re) => re.test(p));

let filesRaw = "";
try {
  try {
    filesRaw = execSync(
      "rg -l --glob '*.{tsx,ts,jsx,js}' --glob '!**/node_modules/**' " +
        "--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
        "'#(?:0033[Ff][Ee]|0[Bb][Ff]1[Cc]3|8[Bb]5[Cc][Ff]6|[Ee][Ff]4444|[Ff]59[Ee]0[Bb]|10[Bb]981)\\b' apps",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    filesRaw = "";
  }
} catch {
  filesRaw = "";
}

const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isAllowedPath(f));
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (!HEX_RE.test(line)) return;
    if (/@allow-brand-hex:/.test(line) || /@allow-brand-hex:/.test(lines[i - 1] ?? "")) {
      return;
    }
    // Pure comments documenting the mapping are fine
    if (/^\s*(\/\/|\*|\/\*)/.test(line) && /→|var\(--|brand|status/.test(line)) return;
    violations.push({ file, line: i + 1, text: line.trim().slice(0, 200) });
  });
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ No hardcoded brand/status hex in governed apps/** UI (scanned ${filesRaw ? filesRaw.split("\n").filter(Boolean).length : 0} candidate(s)).\n`,
  );
  process.exit(0);
}

process.stderr.write(`\n❌ ${violations.length} hardcoded brand/status hex value(s):\n\n`);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}\n    ${v.text}\n`);
}
process.stderr.write(
  "\nFix:\n" +
    "  #0033FE → var(--brand-primary)   #0BF1C3 → var(--brand-accent)\n" +
    "  #8b5cf6 → var(--brand-tertiary)  #ef4444 → var(--status-danger)\n" +
    "  #f59e0b → var(--status-warning)  #10b981 → var(--status-success)\n" +
    "Escape hatch: // @allow-brand-hex: <reason> on the line or previous line.\n\n",
);
process.exit(1);
