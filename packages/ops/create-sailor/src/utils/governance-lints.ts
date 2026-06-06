import fs from "node:fs";
import path from "node:path";
import type { NebutraConfig } from "./config";

// applyGovernanceLints — wires the generalized, config-driven governance lints
// (shipped into the output under scripts/governance/ via cloneTemplate) into the
// scaffolded project's `pnpm lint` pipeline, feature-gated per lint.
//
// Two concerns, both feature-aware:
//   1. Write governance.config.json with scaffold-layout defaults — only the
//      sections for the lints that are actually enabled. A fresh scaffold has
//      ZERO bypasses, so every ratchet allowlist starts empty.
//   2. Patch the cloned root package.json "lint" script to chain
//      `node scripts/governance/lint-*.mjs` for each enabled lint, preserving
//      the existing head of the chain (e.g. `biome check .`).
//
// Gating:
//   • no-raw-inputs   — gateFeature "always". The scaffold always ships the UI
//                       layer + apps/, so the rule always applies.
//   • repository-seam — gateFeature "database". A core-domain data-layer ratchet;
//                       meaningless when database=none.
//
// Design-system-specific lints (dark-overrides, spacing-opacity,
// arbitrary-breakpoints, phosphor-zone) are intentionally NOT shipped — they
// encode internal token-authoring invariants, not rules a downstream SaaS needs.

const RAW_INPUTS_CMD = "node scripts/governance/lint-no-raw-inputs.mjs";
const REPOSITORY_SEAM_CMD = "node scripts/governance/lint-repository-seam.mjs";
const BRAND_LITERALS_CMD = "node scripts/governance/lint-brand-literals.mjs";
const MICROCOPY_CMD = "node scripts/governance/lint-microcopy.mjs";

// All command fragments this util manages. Any inherited reference to one of
// these (or to the monorepo's own path-hardcoded scripts/lint-*.mjs, which are
// design-system-specific and not shipped to scaffolds) is rebuilt from scratch
// so the output's lint chain contains exactly the enabled, generalized lints.
// Regex also matches lint-microcopy so inherited monorepo references are pruned.
const MONOREPO_LINT_CMD_RE = /\bnode\s+scripts\/(governance\/)?lint-[\w-]+\.mjs/g;

// The monorepo's per-lint helper scripts reference scripts/lint-*.mjs at the
// repo root (NOT under governance/). Those .mjs files are removed from the
// scaffold by .templateignore, so any cloned package.json script that points at
// them is dangling and must be pruned — otherwise the scaffold ships broken
// `lint:no-dark-drift`, `lint:phosphor-zone`, … scripts.
const MONOREPO_ROOT_LINT_CMD_RE = /\bnode\s+scripts\/lint-[\w-]+\.mjs/;

// Scaffold-layout defaults for governance.config.json. These mirror the
// built-in DEFAULTS in scripts/governance/_config.mjs so the emitted file is an
// explicit, editable starting point — but contain NO monorepo-absolute paths.
const RAW_INPUTS_DEFAULTS = {
  scanRoots: ["apps"],
  primitivesImport: "@nebutra/ui/primitives",
  // The scaffold ships docs-shell preview/demo components (e.g. the Fumadocs
  // skeleton under apps/design-docs/src/components/previews/, kept by
  // .templateignore) that intentionally render raw native form controls to
  // demonstrate browser behavior. Storybook stories do the same. These are
  // documentation demos, not product UI, so they are exempt — exactly as the
  // monorepo's own lint-no-raw-inputs.mjs whitelists them.
  whitelist: [
    "/storybook/src/stories/",
    "/design-docs/src/components/previews/",
    "/sailor-docs/src/components/previews/",
    "\\.test\\.tsx?$",
    "/__tests__/",
  ],
};

const REPOSITORY_SEAM_DEFAULTS = {
  coreDomains: [
    "^packages/.*/(billing|license|metering|auth|audit|permissions|identity|tenant)/",
    "^backends/gateway/src/routes/(billing|ai|admin|legal|integrations|webhooks)/",
    "^apps/web/src/app/api/",
  ],
  seamPaths: ["^packages/platform/repositories/", "^packages/platform/db/"],
  dbAccessors: ["getTenantDb", "getSystemDb"],
  // SHRINK-ONLY ratchet baseline. The scaffold ships working core-domain code
  // (billing/license/audit/admin/webhook routes, team-invitation flows) that
  // currently accesses the DB client directly via the configured dbAccessors
  // rather than through a platform repository. These pre-existing bypasses are
  // the scaffold's starting baseline — the ratchet's job is to prevent NEW ones
  // and to flag any of these once they migrate. Mirrors the monorepo's own
  // KNOWN_SEAM_BYPASS, filtered to the files that actually ship (internal-only
  // files like the inngest functions and side packages are stripped by
  // .templateignore, so they are intentionally absent here).
  allowlist: [
    "apps/web/src/app/api/invitations/[invitationId]/accept/route.ts",
    "apps/web/src/app/api/onboarding/invite-members/route.ts",
    "apps/web/src/app/api/startup-os/projects/[projectId]/runs/[runId]/execute/route.ts",
    "backends/gateway/src/routes/admin/index.ts",
    "backends/gateway/src/routes/ai/api-keys.ts",
    "backends/gateway/src/routes/ai/usage.ts",
    "backends/gateway/src/routes/billing/index.ts",
    "backends/gateway/src/routes/integrations/index.ts",
    "backends/gateway/src/routes/legal/consent.ts",
    "backends/gateway/src/routes/webhooks/clerk.ts",
    "backends/gateway/src/routes/webhooks/stripe.ts",
    "packages/commerce/license/src/issue-license.ts",
    "packages/commerce/license/src/validate-license.ts",
    "packages/iam/audit/src/index.ts",
  ] as string[],
};

// Microcopy ratchet defaults. Always-on — scaffolded projects enforce the
// seven-prohibition rule from day one. The bannedPatterns array is intentionally
// EMPTY: a fresh scaffold has no Nebutra-specific Chinese copy rules baked in.
// Project operators add their own patterns to governance.config.json. The
// allowlist is also empty — no pre-existing microcopy debt on a clean scaffold.
const MICROCOPY_DEFAULTS = {
  scanRoots: ["apps/web/src"],
  excludePaths: [
    "/api/",
    "\\.test\\.tsx?$",
    "/__tests__/",
    "/storybook/src/stories/",
    "/design-docs/",
    "/sailor-docs/",
  ],
  // Project-specific banned copy patterns go here (array of { pattern, label }).
  // See scripts/governance/lint-microcopy.mjs for the mechanically-lintable
  // subset (禁七/禁四/禁一 partial + emoji/exclamation). Human-review patterns
  // (禁二/禁三/禁五/禁六 + §6.5 IP red lines) must NOT be added as mechanical rules.
  bannedPatterns: [] as { pattern: string; label: string }[],
  // SHRINK-ONLY ratchet. Fresh scaffolds start with ZERO microcopy debt.
  allowlist: [] as string[],
};

// Brand-literal ratchet defaults. Always-on — scaffolded projects enforce
// single-source brand identity from day one. The allowlist starts empty:
// a fresh scaffold has zero brand debt (no pre-seeded raw brand literals).
// Operators who add brand identity to their apps must import from the
// brand package rather than hardcoding strings.
const BRAND_LITERALS_DEFAULTS = {
  governedPaths: ["apps", "packages/commerce", "packages/integrations/email"],
  allowExpressions: [
    "Nebutra",
    "云毓智能",
    "云毓",
    "nebutra\\.com",
    "nebutra\\.ai",
    "#0033FE",
    "#0BF1C3",
  ],
  knownExemptPatterns: [
    "\\.stories\\.tsx?$",
    "/__tests__/",
    "\\.test\\.tsx?$",
    "/previews/",
    "^packages/design/brand/",
    "^packages/design/tokens/",
    "^packages/design/design-tokens/",
  ],
  // SHRINK-ONLY ratchet. Fresh scaffolds start with ZERO brand debt — the
  // allowlist is intentionally empty. Unlike repositorySeam, no shipped files
  // legitimately contain raw brand literals at scaffold time (they all
  // import from @nebutra/brand/metadata). If a downstream project accumulates
  // legacy literals, they add them here and migrate on-touch.
  allowlist: [] as string[],
};

export interface GovernanceLintsResult {
  /** Lint command fragments appended to the package.json "lint" script. */
  lints: string[];
  /** Whether governance.config.json was written. */
  configWritten: boolean;
}

/**
 * Rebuild a package.json "lint" script's chain.
 *
 * Strips any inherited `node scripts/(governance/)?lint-*.mjs` references — the
 * cloned template carries the monorepo's own path-hardcoded, design-system-
 * specific lint commands, which do not belong in a scaffold — then re-appends
 * exactly the enabled generalized governance commands. The non-lint head of the
 * chain (e.g. `biome check .`) is preserved.
 */
function rebuildLintScript(existing: string | undefined, lints: string[]): string {
  const stripped = (existing ?? "")
    .replace(MONOREPO_LINT_CMD_RE, "")
    // collapse the now-dangling ` && ` joiners left by the removals.
    .split("&&")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" && ");

  const head = stripped.length > 0 ? stripped : "biome check .";
  return [head, ...lints].join(" && ");
}

export async function applyGovernanceLints(
  targetDir: string,
  config: NebutraConfig,
): Promise<GovernanceLintsResult> {
  // -- 1. decide which lints are enabled (feature-gated) --
  const databaseEnabled = config.database !== "none";

  const lints: string[] = [RAW_INPUTS_CMD]; // always
  if (databaseEnabled) lints.push(REPOSITORY_SEAM_CMD);
  lints.push(BRAND_LITERALS_CMD); // always — enforce single-source brand identity
  lints.push(MICROCOPY_CMD); // always — enforce seven-prohibition microcopy rule

  // -- 2. write governance.config.json with only enabled sections --
  const governanceConfig: Record<string, unknown> = {
    rawInputs: RAW_INPUTS_DEFAULTS,
    brandLiterals: BRAND_LITERALS_DEFAULTS,
    microcopyRules: MICROCOPY_DEFAULTS,
  };
  if (databaseEnabled) {
    governanceConfig.repositorySeam = REPOSITORY_SEAM_DEFAULTS;
  }

  const configPath = path.join(targetDir, "governance.config.json");
  fs.writeFileSync(configPath, JSON.stringify(governanceConfig, null, 2) + "\n");

  // -- 3. patch the cloned root package.json "lint" script --
  const pkgPath = path.join(targetDir, "package.json");
  // Read-then-act (no existsSync check) avoids a check-then-use file race.
  let pkgRaw: string | undefined;
  try {
    pkgRaw = fs.readFileSync(pkgPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (pkgRaw !== undefined) {
    const pkg = JSON.parse(pkgRaw);
    pkg.scripts = pkg.scripts ?? {};

    // Drop dangling per-lint helper scripts inherited from the monorepo
    // (lint:no-dark-drift, lint:phosphor-zone, …). They invoke the repo-root
    // scripts/lint-*.mjs files, which .templateignore removes from the scaffold,
    // so they would error on run. The main `lint` key is rebuilt below.
    for (const [key, value] of Object.entries(pkg.scripts)) {
      if (key === "lint") continue;
      if (typeof value === "string" && MONOREPO_ROOT_LINT_CMD_RE.test(value)) {
        delete pkg.scripts[key];
      }
    }

    pkg.scripts.lint = rebuildLintScript(pkg.scripts.lint, lints);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  return { lints, configWritten: true };
}
