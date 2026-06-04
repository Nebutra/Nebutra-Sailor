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

// All command fragments this util manages. Any inherited reference to one of
// these (or to the monorepo's own path-hardcoded scripts/lint-*.mjs, which are
// design-system-specific and not shipped to scaffolds) is rebuilt from scratch
// so the output's lint chain contains exactly the enabled, generalized lints.
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
  whitelist: ["/storybook/src/stories/", "\\.test\\.tsx?$", "/__tests__/"],
};

const REPOSITORY_SEAM_DEFAULTS = {
  coreDomains: [
    "^packages/.*/(billing|license|metering|auth|audit|permissions|identity|tenant)/",
    "^backends/gateway/src/routes/(billing|ai|admin|legal|integrations|webhooks)/",
    "^apps/web/src/app/api/",
  ],
  seamPaths: ["^packages/platform/repositories/", "^packages/platform/db/"],
  dbAccessors: ["getTenantDb", "getSystemDb"],
  // Fresh scaffold has ZERO bypasses → shrink-only ratchet starts empty.
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

  // -- 2. write governance.config.json with only enabled sections --
  const governanceConfig: Record<string, unknown> = {
    rawInputs: RAW_INPUTS_DEFAULTS,
  };
  if (databaseEnabled) {
    governanceConfig.repositorySeam = REPOSITORY_SEAM_DEFAULTS;
  }

  const configPath = path.join(targetDir, "governance.config.json");
  fs.writeFileSync(configPath, JSON.stringify(governanceConfig, null, 2) + "\n");

  // -- 3. patch the cloned root package.json "lint" script --
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
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
