import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NebutraConfig } from "./config";
import { resolveScaffoldDeployTargets } from "./deploy";
import { applyGovernanceLints } from "./governance-lints";

// Wiring tests for applyGovernanceLints — proves the scaffold step:
//   (a) always wires no-raw-inputs into the output's lint chain,
//   (b) gates repository-seam on a scaffolded database,
//   (b2) always wires microcopy lint regardless of database setting,
//   (c) writes governance.config.json with only the enabled sections (empty
//       ratchet allowlists for a fresh scaffold),
//   (c2) microcopyRules section present with empty bannedPatterns + allowlist,
//   (d) strips inherited monorepo path-hardcoded lint commands while preserving
//       the biome head.

function baseConfig(overrides: Partial<NebutraConfig> = {}): NebutraConfig {
  return {
    region: "global",
    orm: "prisma",
    database: "postgresql",
    payment: "none",
    aiProviders: [],
    deployTarget: "none",
    deployTargets: resolveScaffoldDeployTargets("none"),
    i18n: false,
    ...overrides,
  };
}

function writePkg(dir: string, lint: string) {
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "scaffold", scripts: { lint } }, null, 2) + "\n",
  );
}

function readPkgLint(dir: string): string {
  return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).scripts.lint;
}

function readGovernance(dir: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(dir, "governance.config.json"), "utf8"));
}

describe("applyGovernanceLints (scaffold wiring)", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { force: true, recursive: true });
      dir = undefined;
    }
  });

  it("(a)+(b) wires raw-inputs, repository-seam, brand-literals, and microcopy when a database is scaffolded", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-db-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));

    expect(result.lints).toEqual([
      "node scripts/governance/lint-no-raw-inputs.mjs",
      "node scripts/governance/lint-repository-seam.mjs",
      "node scripts/governance/lint-brand-literals.mjs",
      "node scripts/governance/lint-microcopy.mjs",
    ]);
    const lint = readPkgLint(dir);
    expect(lint).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs && node scripts/governance/lint-brand-literals.mjs && node scripts/governance/lint-microcopy.mjs",
    );
  });

  it("(b) omits repository-seam but keeps brand-literals and microcopy when database=none", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-nodb-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "none" }));

    expect(result.lints).toEqual([
      "node scripts/governance/lint-no-raw-inputs.mjs",
      "node scripts/governance/lint-brand-literals.mjs",
      "node scripts/governance/lint-microcopy.mjs",
    ]);
    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-brand-literals.mjs && node scripts/governance/lint-microcopy.mjs",
    );
  });

  it("(c)+(c2) writes governance.config.json with enabled sections + seeded ratchet baselines", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));
    const cfg = readGovernance(dir) as {
      rawInputs?: { whitelist?: unknown };
      repositorySeam?: { allowlist?: unknown[] };
      brandLiterals?: { allowlist?: unknown[]; governedPaths?: string[] };
      microcopyRules?: { bannedPatterns?: unknown[]; allowlist?: unknown[]; scanRoots?: string[] };
    };

    expect(cfg.rawInputs).toBeDefined();
    expect(cfg.repositorySeam).toBeDefined();
    expect(cfg.brandLiterals).toBeDefined();

    // The scaffold ships working core-domain code that bypasses the seam, so the
    // shrink-only ratchet baseline is the seeded set of those shipped files (NOT
    // empty — an empty baseline would make a clean scaffold fail its own lint).
    const seamAllowlist = cfg.repositorySeam?.allowlist as string[];
    expect(Array.isArray(seamAllowlist)).toBe(true);
    expect(seamAllowlist.length).toBeGreaterThan(0);
    // No monorepo-absolute paths leak in — entries are project-root-relative.
    for (const entry of seamAllowlist) {
      expect(entry).not.toMatch(/^\/|Nebutra-Sailor|node_modules/);
    }
    // Representative shipped core-domain bypasses are present.
    expect(seamAllowlist).toContain("backends/gateway/src/routes/billing/index.ts");
    expect(seamAllowlist).toContain("packages/commerce/license/src/issue-license.ts");

    // Brand-literals allowlist is EMPTY for a fresh scaffold — no brand debt.
    const brandAllowlist = cfg.brandLiterals?.allowlist as string[];
    expect(Array.isArray(brandAllowlist)).toBe(true);
    expect(brandAllowlist).toHaveLength(0);
    // Governed paths are present.
    expect(cfg.brandLiterals?.governedPaths).toContain("apps");

    // (c2) microcopyRules is always present with empty debt baseline.
    expect(cfg.microcopyRules).toBeDefined();
    const microBannedPatterns = cfg.microcopyRules?.bannedPatterns as unknown[];
    expect(Array.isArray(microBannedPatterns)).toBe(true);
    expect(microBannedPatterns).toHaveLength(0);
    const microAllowlist = cfg.microcopyRules?.allowlist as string[];
    expect(Array.isArray(microAllowlist)).toBe(true);
    expect(microAllowlist).toHaveLength(0);
    // Default scan root matches the authenticated product surface.
    expect(cfg.microcopyRules?.scanRoots).toContain("apps/web/src");
  });

  it("(c) omits repositorySeam section from config when database=none, keeps brandLiterals and microcopyRules", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-nodb-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "none" }));
    const cfg = readGovernance(dir) as {
      rawInputs?: unknown;
      repositorySeam?: unknown;
      brandLiterals?: { allowlist?: unknown[] };
      microcopyRules?: { bannedPatterns?: unknown[]; allowlist?: unknown[] };
    };

    expect(cfg.rawInputs).toBeDefined();
    expect(cfg.repositorySeam).toBeUndefined();
    // Brand-literals is always present.
    expect(cfg.brandLiterals).toBeDefined();
    expect((cfg.brandLiterals?.allowlist as string[]).length).toBe(0);
    // microcopyRules is always present — feature-independent.
    expect(cfg.microcopyRules).toBeDefined();
    expect((cfg.microcopyRules?.bannedPatterns as unknown[]).length).toBe(0);
    expect((cfg.microcopyRules?.allowlist as string[]).length).toBe(0);
  });

  it("(d) strips inherited monorepo path-hardcoded lint commands, preserves biome head", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-strip-"));
    // Simulate the cloned monorepo root lint chain (also includes lint-microcopy).
    writePkg(
      dir,
      "biome check . && node scripts/lint-no-raw-inputs.mjs && node scripts/lint-no-dark-overrides.mjs && node scripts/lint-repository-seam.mjs && node scripts/lint-microcopy.mjs",
    );

    await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));

    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs && node scripts/governance/lint-brand-literals.mjs && node scripts/governance/lint-microcopy.mjs",
    );
  });

  it("(d2) falls back to `biome check .` head when the lint script is missing", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-nolint-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "scaffold", scripts: {} }, null, 2) + "\n",
    );

    await applyGovernanceLints(dir, baseConfig({ database: "none" }));

    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-brand-literals.mjs && node scripts/governance/lint-microcopy.mjs",
    );
  });
});
