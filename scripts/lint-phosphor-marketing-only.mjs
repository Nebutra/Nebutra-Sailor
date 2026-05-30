#!/usr/bin/env node

// CI guard: @phosphor-icons may ONLY be imported in marketing surfaces.
//
// 2026 icon governance (CLAUDE.md / MEMORY.md) — three-tier hierarchy:
//   • @nebutra/icons (Geist 541) — DEFAULT for ALL product/app/dashboard surfaces.
//   • @phosphor-icons/react (light/thin weight) — ONLY for AI-brand emphasis in
//     MARKETING surfaces (hero, feature bento). Phosphor's visual language is
//     distinct from Geist (warmer/rounder), so mixing it into product reads as
//     inconsistent; its thin weight also degrades at small/dense sizes.
//   • lucide-react — removed (deprecated).
//
// Allowed Phosphor zones:
//   • apps/landing-page/**                — the public marketing site
//   • packages/design/ui/src/marketing/** — marketing component library
//   • *.stories.tsx, **/previews/**, tests — demos / docs, not shipped product
//
// Run: node scripts/lint-phosphor-marketing-only.mjs
// Exit 1 on any @phosphor-icons import outside the marketing zone.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Paths are relative to the repo root (where `pnpm lint` runs).
const ALLOWED = [
  /^apps\/landing-page\//,
  /^packages\/design\/ui\/src\/marketing\//,
  /\.stories\.tsx?$/,
  /\/previews\//,
  /\.test\.tsx?$/,
  /\/__tests__\//,
];

const isAllowed = (path) => ALLOWED.some((re) => re.test(path));

// Loose file-level grep — the package name only appears in imports/comments.
// Precise import detection happens per-line below, so comment mentions never
// false-positive.
let filesRaw = "";
try {
  filesRaw = execSync(
    "grep -rlE '@phosphor-icons' --include='*.ts' --include='*.tsx' apps packages 2>/dev/null " +
      "| grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/'",
    { encoding: "utf-8" },
  ).trim();
} catch {
  // grep exits non-zero when there are zero matches — that is a clean pass.
  filesRaw = "";
}

const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isAllowed(f));

const IMPORT_RE = /from\s+['"]@phosphor-icons/;

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (IMPORT_RE.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim() });
    }
  });
}

if (violations.length === 0) {
  process.stdout.write("✅ No @phosphor-icons imports outside marketing surfaces.\n");
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} @phosphor-icons import(s) outside marketing surfaces — ` +
    `product/dashboard must use @nebutra/icons (Geist):\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}  ${v.text}\n`);
}
process.stderr.write(
  "\nWhy: Phosphor's visual language differs from Geist (the product default), and its thin\n" +
    "weight degrades at small/dense sizes — keep it to large marketing display only.\n" +
    "Fix:\n" +
    '  • Product/dashboard icons → import from "@nebutra/icons" (Geist).\n' +
    "  • Phosphor is allowed only in: apps/landing-page/**, packages/design/ui/src/marketing/**,\n" +
    "    and *.stories.tsx / **/previews/** / test files.\n\n",
);
process.exit(1);
