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
  "packages/ui/package.json",
  "packages/tokens/package.json",
  "packages/create-sailor/package.json",
  "apps/web/package.json",
  "apps/web/src/app/layout.tsx",
  "apps/web/src/app/globals.css",
  "apps/landing-page/package.json",
  "apps/landing-page/src/app/[lang]/layout.tsx",
  "apps/api-gateway/package.json",
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

interface Rule {
  pattern: string;
  negate: boolean;
  dirOnly: boolean;
}

function parseIgnore(content: string): Rule[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((raw) => {
      let line = raw;
      let negate = false;
      if (line.startsWith("!")) {
        negate = true;
        line = line.slice(1);
      }
      const dirOnly = line.endsWith("/");
      if (dirOnly) line = line.slice(0, -1);
      if (line.startsWith("/")) line = line.slice(1);
      return { pattern: line, negate, dirOnly };
    });
}

// Minimal gitignore-ish matcher: supports exact prefix/dir match + simple globs.
function matchesRule(relPath: string, isDir: boolean, rule: Rule): boolean {
  if (rule.dirOnly && !isDir && !relPath.startsWith(rule.pattern + "/")) return false;

  const pat = rule.pattern;

  // Exact match or directory prefix match
  if (relPath === pat) return true;
  if (relPath.startsWith(pat + "/")) return true;

  // Glob-ish: convert * and ** to regex
  if (pat.includes("*")) {
    const re = new RegExp(
      "^" +
        pat
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, "::DOUBLE::")
          .replace(/\*/g, "[^/]*")
          .replace(/::DOUBLE::/g, ".*") +
        "(/.*)?$",
    );
    if (re.test(relPath)) return true;
  }

  // Basename match for rules without slashes
  if (!pat.includes("/")) {
    const base = path.basename(relPath);
    if (base === pat) return true;
  }

  return false;
}

function isIgnored(relPath: string, isDir: boolean, rules: Rule[]): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (matchesRule(relPath, isDir, rule)) {
      ignored = !rule.negate;
    }
  }
  return ignored;
}

function walk(
  dir: string,
  rules: Rule[],
  preserved: string[],
  stripped: string[],
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (HARD_SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO_ROOT, full).split(path.sep).join("/");
    const isDir = entry.isDirectory();

    if (isIgnored(rel, isDir, rules)) {
      stripped.push(rel + (isDir ? "/" : ""));
      continue; // Don't descend into stripped directories
    }

    if (isDir) {
      walk(full, rules, preserved, stripped);
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

  const rules = parseIgnore(fs.readFileSync(IGNORE_FILE, "utf8"));
  const preserved: string[] = [];
  const stripped: string[] = [];

  walk(REPO_ROOT, rules, preserved, stripped);

  process.stdout.write("\n=== Template Check ===\n\n");
  process.stdout.write(`Rules loaded:     ${rules.length}\n`);
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
    if (!isIgnored(p, isDir, rules)) leakedBusiness.push(p);
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
