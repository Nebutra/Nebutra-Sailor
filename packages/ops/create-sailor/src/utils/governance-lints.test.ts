import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NebutraConfig } from "./config";
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

  it("(a)+(b) wires both lints when a database is scaffolded", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-db-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));

    expect(result.lints).toEqual([
      "node scripts/governance/lint-no-raw-inputs.mjs",
      "node scripts/governance/lint-repository-seam.mjs",
    ]);
    const lint = readPkgLint(dir);
    expect(lint).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs",
    );
  });

  it("(b) omits repository-seam when database=none", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-nodb-"));
    writePkg(dir, "biome check .");

    const result = await applyGovernanceLints(dir, baseConfig({ database: "none" }));

    expect(result.lints).toEqual(["node scripts/governance/lint-no-raw-inputs.mjs"]);
    expect(readPkgLint(dir)).toBe(
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs",
    );
  });

  it("(c) writes governance.config.json with only enabled sections + empty ratchet", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "postgresql" }));
    const cfg = readGovernance(dir) as {
      rawInputs?: { whitelist?: unknown };
      repositorySeam?: { allowlist?: unknown[] };
    };

    expect(cfg.rawInputs).toBeDefined();
    expect(cfg.repositorySeam).toBeDefined();
    // Fresh scaffold has ZERO bypasses → empty shrink-only ratchet baseline.
    expect(cfg.repositorySeam?.allowlist).toEqual([]);
  });

  it("(c) omits repositorySeam section from config when database=none", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-wire-cfg-nodb-"));
    writePkg(dir, "biome check .");

    await applyGovernanceLints(dir, baseConfig({ database: "none" }));
    const cfg = readGovernance(dir);

    expect(cfg.rawInputs).toBeDefined();
    expect(cfg.repositorySeam).toBeUndefined();
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
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs && node scripts/governance/lint-repository-seam.mjs",
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
      "biome check . && node scripts/governance/lint-no-raw-inputs.mjs",
    );
  });
});
