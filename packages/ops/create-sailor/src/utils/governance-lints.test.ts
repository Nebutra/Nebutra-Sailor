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
//   (c) writes governance.config.json with only the enabled sections (empty
//       ratchet allowlists for a fresh scaffold),
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

  it("(a)+(b) wires raw-inputs, repository-seam, and brand-literals when a database is scaffolded", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-db-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));

    expect(result.lints).toEqual([
      "node scripts/governance/lint-no-raw-inputs.mjs",
      "node scripts/governance/lint-repository-seam.mjs",
      "node scripts/governance/lint-brand-literals.mjs",
    ]);
    const lint = readPkgLint(dir);
    expect(lint).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs && node scripts/governance/lint-brand-literals.mjs",
    );
  });

  it("(b) omits repository-seam but keeps brand-literals when database=none", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-nodb-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "none" }));

    expect(result.lints).toEqual([
      "node scripts/governance/lint-no-raw-inputs.mjs",
      "node scripts/governance/lint-brand-literals.mjs",
    ]);
    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-brand-literals.mjs",
    );
  });

  it("(c) writes governance.config.json with enabled sections + seeded ratchet baselines", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));
    const cfg = readGovernance(dir) as {
      rawInputs?: { whitelist?: unknown };
      repositorySeam?: { allowlist?: unknown[] };
      brandLiterals?: { allowlist?: unknown[]; governedPaths?: string[] };
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
  });

  it("(c) omits repositorySeam section from config when database=none, keeps brandLiterals", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-nodb-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "none" }));
    const cfg = readGovernance(dir) as {
      rawInputs?: unknown;
      repositorySeam?: unknown;
      brandLiterals?: { allowlist?: unknown[] };
    };

    expect(cfg.rawInputs).toBeDefined();
    expect(cfg.repositorySeam).toBeUndefined();
    // Brand-literals is always present.
    expect(cfg.brandLiterals).toBeDefined();
    expect((cfg.brandLiterals?.allowlist as string[]).length).toBe(0);
  });

  it("(d) strips inherited monorepo path-hardcoded lint commands, preserves biome head", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-strip-"));
    // Simulate the cloned monorepo root lint chain.
    writePkg(
      dir,
      "biome check . && node scripts/lint-no-raw-inputs.mjs && node scripts/lint-no-dark-overrides.mjs && node scripts/lint-repository-seam.mjs",
    );

    await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));

    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs && node scripts/governance/lint-brand-literals.mjs",
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
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-brand-literals.mjs",
    );
  });
});
