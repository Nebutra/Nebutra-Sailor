#!/usr/bin/env tsx
/**
 * template-check.ts
 *
 * Dry-run validator for `.templateignore`.
 *
 * Reads `.templateignore` from the repo root, walks the filesystem, and
 * reports what a fresh `create-sailor` scaffold would contain vs. strip.
 *
 * Run: `pnpm template:check`
 */
import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";

const REPO_ROOT = path.resolve(__dirname, "..");
const IGNORE_FILE = path.join(REPO_ROOT, ".templateignore");

// Dirs we never walk into during the dry-run (noise).
const HARD_SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".vercel",
]);

// Must-preserve files — scaffold is broken if any of these disappear.
const MUST_PRESERVE = [
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "tsconfig.base.json",
  "biome.json",
  "packages/design/ui/package.json",
  "packages/design/tokens/package.json",
  "packages/ops/create-sailor/package.json",
  "apps/web/package.json",
  "apps/web/src/app/layout.tsx",
  "apps/web/src/app/globals.css",
  "apps/landing-page/package.json",
  "apps/landing-page/src/app/[lang]/layout.tsx",
  "backends/gateway/package.json",
];

// Must-strip files — Nebutra business content leaking into scaffold is a bug.
const MUST_STRIP = [
  "WHITELABEL.md",
  "BRAND_GUIDELINES.md",
  "TRADEMARK.md",
  "marketing",
  "changelog",
  "apps/sleptons",
  "apps/tsekaluk-dev",
  "apps/design-docs/content",
  "apps/docs-hub",
  "apps/docs",
  "apps/studio",
  "apps/sailor-docs",
  "docs/plans",
  "docs/DOMAINS.md",
  ".env",
  ".env.local",
  "scripts/lighthouse",
  "e2e/changelog.spec.ts",
  ".templateignore",
  "TEMPLATE.md",
  "apps/landing-page/src/components/landing/HeroSection.tsx",
  "apps/landing-page/src/app/[lang]/(marketing)/pricing",
  "apps/landing-page/src/app/[lang]/(legal)/privacy",
  "apps/web/src/app/[locale]/(app)/admin",
  "apps/web/src/app/[locale]/(app)/billing",
  "apps/web/src/app/[locale]/(app)/audit",
  "apps/web/src/app/[locale]/(app)/chat",
  "apps/web/src/app/[locale]/(app)/feature-flags",
  "apps/landing-page/public/brand/logo.svg",
  "apps/landing-page/public/og",
];

type Matcher = ReturnType<typeof ignore>;

function walk(dir: string, matcher: Matcher, preserved: string[], stripped: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (HARD_SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO_ROOT, full).split(path.sep).join("/");
    const isDir = entry.isDirectory();
    // ignore() rejects a leading "/" and dir paths without trailing "/"; the
    // ignore lib expects relative paths with no leading slash.
    const probe = isDir ? `${rel}/` : rel;

    if (matcher.ignores(probe)) {
      stripped.push(rel + (isDir ? "/" : ""));
      continue;
    }

    if (isDir) {
      walk(full, matcher, preserved, stripped);
    } else {
      preserved.push(rel);
    }
  }
}

function main() {
  if (!fs.existsSync(IGNORE_FILE)) {
    process.stderr.write("ERROR: .templateignore not found at repo root\n");
    process.exit(1);
  }

  const patterns = fs.readFileSync(IGNORE_FILE, "utf8");
  const matcher = ignore().add(patterns);
  const ruleCount = patterns
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  const preserved: string[] = [];
  const stripped: string[] = [];

  walk(REPO_ROOT, matcher, preserved, stripped);

  process.stdout.write("\n=== Template Check ===\n\n");
  process.stdout.write(`Rules loaded:     ${ruleCount}\n`);
  process.stdout.write(`Files preserved:  ${preserved.length}\n`);
  process.stdout.write(`Paths stripped:   ${stripped.length}\n\n`);

  // Verify must-preserve
  const missingPreserve: string[] = [];
  for (const p of MUST_PRESERVE) {
    const full = path.join(REPO_ROOT, p);
    if (!fs.existsSync(full)) continue; // Skip if not in repo (informational)
    if (!preserved.includes(p)) missingPreserve.push(p);
  }

  // Verify must-strip
  const leakedBusiness: string[] = [];
  for (const p of MUST_STRIP) {
    const full = path.join(REPO_ROOT, p);
    if (!fs.existsSync(full)) continue;
    const isDir = fs.statSync(full).isDirectory();
    const probe = isDir ? `${p}/` : p;
    if (!matcher.ignores(probe)) leakedBusiness.push(p);
  }

  let failed = false;

  if (missingPreserve.length > 0) {
    failed = true;
    process.stdout.write("FAIL: these skeleton files were incorrectly stripped:\n");
    for (const p of missingPreserve) process.stdout.write(`  - ${p}\n`);
    process.stdout.write("\n");
  } else {
    process.stdout.write("OK: all required skeleton files preserved.\n");
  }

  if (leakedBusiness.length > 0) {
    failed = true;
    process.stdout.write("\nFAIL: these Nebutra business files leaked into scaffold:\n");
    for (const p of leakedBusiness) process.stdout.write(`  - ${p}\n`);
    process.stdout.write("\n");
  } else {
    process.stdout.write("OK: all known Nebutra business content stripped.\n");
  }

  // Preview a small slice of what's kept vs. dropped
  process.stdout.write("\n--- Sample preserved (first 15) ---\n");
  for (const p of preserved.slice(0, 15)) process.stdout.write(`  + ${p}\n`);
  process.stdout.write("\n--- Sample stripped (first 15) ---\n");
  for (const p of stripped.slice(0, 15)) process.stdout.write(`  - ${p}\n`);

  process.stdout.write(
    `\nSummary: ${preserved.length} files preserved, ${stripped.length} paths stripped.\n`,
  );

  if (failed) {
    process.stderr.write("\ntemplate-check FAILED\n");
    process.exit(1);
  }
  process.stdout.write("\ntemplate-check PASSED\n");
}

main();
