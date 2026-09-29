#!/usr/bin/env tsx
/**
 * template-check.ts
 *
 * Verifies what a fresh `create-sailor` scaffold would contain, by checking
 * the template scripts/template-build.ts actually produces — not the
 * `.templateignore` file alone. template-build strips in several steps
 * (.templateignore, the landing pages site-map.ts marks `template: false`,
 * `*.for-template.*` swaps, unreachable-module pruning); a check that read
 * only the ignore file went stale the moment a path moved to another step
 * (#664), and would equally miss a leak another step let through.
 *
 * Run: `pnpm template:check`             builds the template into a temp dir
 *      `pnpm template:check --dir=<out>`  checks an already built template
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SITE_MAP } from "../apps/landing/src/site-map";

const REPO_ROOT = path.resolve(__dirname, "..");
const IGNORE_FILE = path.join(REPO_ROOT, ".templateignore");

// Dirs we never walk into when counting the output (noise).
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
  "apps/landing/package.json",
  "apps/landing/src/app/[lang]/layout.tsx",
  "backends/gateway/package.json",
  // Generic ops surfaces that must survive the instance/product boundary rules.
  // `/ops/` is anchored; packages/ops and infra/ops are product, not instance.
  "packages/ops/create-sailor/package.json",
  "infra/ops/scripts/check-env.ts",
  "infra/ops/dns/topology.defaults.yaml",
  "docs/ops/cost-guardrails.md",
  "docs/ops/cloudflare-ci-token.md",
  ".github/workflows/ci.yml",
  ".github/workflows/clean-install.yml",
  "tests/architecture/dependency-flow.test.ts",
];

// Must-strip files — Nebutra business content leaking into scaffold is a bug.
const MUST_STRIP = [
  "WHITELABEL.md",
  "BRAND_GUIDELINES.md",
  "TRADEMARK.md",
  "marketing",
  "changelog",
  "apps/sleptons",
  "apps/docs-hub",
  "apps/docs",
  "apps/studio",
  "apps/sailor-docs",
  // Product lines — must never ship in create-sailor output
  "apps/forge",
  "apps/router",
  "apps/pebble",
  "apps/typelens",
  "apps/design",
  "apps/admin",
  "apps/auth",
  "apps/para",
  "e2e/sleptons",
  "backends/go",
  "backends/rust",
  "infra/nebutra-router",
  "backends/gateway/src/routes/pebble",
  "backends/gateway/src/routes/startup-os",
  "docs/plans",
  "docs/DOMAINS.md",
  ".env",
  ".env.local",
  "scripts/lighthouse",
  "e2e/changelog.spec.ts",
  ".templateignore",
  "TEMPLATE.md",
  // The Nebutra site (rail shell, its pages) and its shadcn registry. The
  // template ships the top-nav site instead; which (marketing)/(legal) pages
  // it keeps is apps/landing/src/site-map.ts, checked below page by page.
  "apps/landing/src/nebutra",
  "apps/landing/src/app/r",
  "apps/landing/src/components/landing/solutions",
  "apps/landing/src/components/landing/navbar/SolutionsMegaMenu.tsx",
  "apps/web/src/app/[locale]/(app)/admin",
  "apps/web/src/app/[locale]/(app)/billing",
  "apps/web/src/app/[locale]/(app)/audit",
  "apps/web/src/app/[locale]/(app)/chat",
  "apps/web/src/app/[locale]/(app)/feature-flags",
  "apps/landing/public/brand/logo.svg",
  "apps/landing/public/og",
  // Product deploy / DNS (sample — globs cover the rest in .templateignore)
  ".github/workflows/point-dns.yml",
  ".github/workflows/deploy-carina-ecs.yml",
  ".github/workflows/deploy-carina-fly.yml",
  ".github/workflows/deploy-new-api-fly.yml",
  ".github/workflows/deploy-dns-leak-fly.yml",
  ".github/workflows/sync-subrepo-mirrors.yml",
  // Nebutra-instance ops vs Sailor-product boundary (TEMPLATE.md) — the three
  // declared homes plus samples of the listed workflows / Fly manifests.
  "ops",
  "docs/ops/nebutra",
  "tests/architecture/nebutra",
  "infra/iac/k8s",
  "infra/iac/railway",
  "infra/fly/gateway.toml",
  "infra/fly/web.toml",
  ".github/workflows/deploy-fly-gateway.yml",
  ".github/workflows/deploy-fly.yml",
  ".github/workflows/ops-vm-triage.yml",
  "tests/architecture/template-boundary.test.ts",
  // Declared provider state + its daily reconcile name Nebutra's projects/apps
  "ops/nebutra",
  ".github/workflows/platform-reconcile.yml",
  "tests/architecture/platform-reconcile.test.ts",
];

const LANDING_ROUTE_GROUPS = [
  "apps/landing/src/app/[lang]/(marketing)",
  "apps/landing/src/app/[lang]/(legal)",
  "apps/landing/src/app/[lang]/(status)",
];

/**
 * site-map.ts decides which landing pages ship: every `template: true` page
 * the repo has must be in the template, every other live page must not.
 * Returns [page paths wrongly missing, page paths wrongly shipped].
 */
function checkSiteMap(out: string): { missing: string[]; leaked: string[] } {
  const missing: string[] = [];
  const leaked: string[] = [];
  for (const page of SITE_MAP) {
    if (page.path === "/" || page.status === "planned") continue;
    for (const group of LANDING_ROUTE_GROUPS) {
      const rel = path.posix.join(group, page.path, "page.tsx");
      if (!fs.existsSync(path.join(REPO_ROOT, rel))) continue;
      const shipped = fs.existsSync(path.join(out, rel));
      if (page.template && !shipped) missing.push(rel);
      if (!page.template && shipped) leaked.push(rel);
    }
  }
  return { missing, leaked };
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (HARD_SKIP.has(entry.name)) continue;
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

/** The built template: `--dir=<out>`, else a fresh template-build into a temp dir. */
function builtTemplate(): { dir: string; cleanup: () => void } {
  const given = process.argv.slice(2).find((a) => a.startsWith("--dir="));
  if (given) {
    const dir = path.resolve(given.slice("--dir=".length));
    if (!fs.existsSync(dir)) {
      process.stderr.write(`ERROR: --dir ${dir} does not exist\n`);
      process.exit(1);
    }
    return { dir, cleanup: () => undefined };
  }
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-template-check-"));
  const dir = path.join(parent, "template");
  process.stdout.write(`Building the template (scripts/template-build.ts) into ${dir}…\n`);
  execFileSync(
    process.execPath,
    ["--import", "tsx", path.join(REPO_ROOT, "scripts/template-build.ts"), `--out=${dir}`],
    { cwd: REPO_ROOT, stdio: ["ignore", "ignore", "inherit"] },
  );
  return { dir, cleanup: () => fs.rmSync(parent, { recursive: true, force: true }) };
}

function main() {
  if (!fs.existsSync(IGNORE_FILE)) {
    process.stderr.write("ERROR: .templateignore not found at repo root\n");
    process.exit(1);
  }

  const { dir: out, cleanup } = builtTemplate();
  let failed = false;
  try {
    // A path the repo does not have cannot leak and need not be preserved;
    // it is listed so a later re-introduction is caught.
    const inRepo = (p: string) => fs.existsSync(path.join(REPO_ROOT, p));
    const inOutput = (p: string) => fs.existsSync(path.join(out, p));

    const siteMap = checkSiteMap(out);
    const missingPreserve = [
      ...MUST_PRESERVE.filter((p) => inRepo(p) && !inOutput(p)),
      ...siteMap.missing,
    ];
    const leakedBusiness = [...MUST_STRIP.filter(inOutput), ...siteMap.leaked];

    process.stdout.write("\n=== Template Check (built output) ===\n\n");
    process.stdout.write(`Template:         ${out}\n`);
    process.stdout.write(`Files in output:  ${countFiles(out)}\n\n`);

    if (missingPreserve.length > 0) {
      failed = true;
      process.stdout.write("FAIL: these skeleton files are missing from the template:\n");
      for (const p of missingPreserve) process.stdout.write(`  - ${p}\n`);
      process.stdout.write("\n");
    } else {
      process.stdout.write("OK: all required skeleton files preserved.\n");
    }

    if (leakedBusiness.length > 0) {
      failed = true;
      process.stdout.write("\nFAIL: these Nebutra business files leaked into the template:\n");
      for (const p of leakedBusiness) process.stdout.write(`  - ${p}\n`);
      process.stdout.write(
        "\n  Strip them in .templateignore, or mark the landing page `template: false`\n" +
          "  in apps/landing/src/site-map.ts, whichever owns the path.\n\n",
      );
    } else {
      process.stdout.write("OK: all known Nebutra business content stripped.\n");
    }
  } finally {
    cleanup();
  }

  if (failed) {
    process.stderr.write("\ntemplate-check FAILED\n");
    process.exit(1);
  }
  process.stdout.write("\ntemplate-check PASSED\n");
}

main();
