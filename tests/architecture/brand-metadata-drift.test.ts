import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Brand metadata drift guard.
 *
 * `packages/design/brand/src/metadata.ts` is a generated artifact —
 * `pnpm brand:apply` writes it from `scripts/brand-types.ts` DEFAULT_BRAND
 * (or a sibling `brand.config.ts` if one exists). Editing metadata.ts
 * by hand silently works until the next `brand:apply` overwrites your
 * changes — exactly the failure mode that nuked the VI brand colors
 * (#0033FE / #0BF1C3 → placeholder values) on CI runs 26079161015
 * through 26081453758.
 *
 * This test snapshots the on-disk metadata.ts, runs brand:apply, and
 * asserts byte-equality. If you legitimately want to change brand data,
 * edit DEFAULT_BRAND in scripts/brand-types.ts (or add a brand.config.ts),
 * re-run `pnpm brand:apply`, and commit BOTH files. This guard ensures
 * the two stay aligned.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const METADATA_PATH = join(ROOT, "packages/design/brand/src/metadata.ts");

describe("brand metadata drift", () => {
  it("metadata.ts is byte-identical to what `pnpm brand:apply` would emit", () => {
    // Snapshot the on-disk file so we can restore it after the script
    // runs (the writer is in-place; we don't want the test to leave the
    // working tree dirty).
    const tmpPath = join(tmpdir(), `brand-metadata-drift-${Date.now()}.ts`);
    copyFileSync(METADATA_PATH, tmpPath);
    const originalBytes = readFileSync(METADATA_PATH, "utf8");

    try {
      execFileSync("pnpm", ["brand:apply"], {
        cwd: ROOT,
        stdio: "pipe",
      });

      const afterBytes = readFileSync(METADATA_PATH, "utf8");
      expect(
        afterBytes,
        "packages/design/brand/src/metadata.ts drifted from what `pnpm brand:apply` " +
          "would emit. Edit DEFAULT_BRAND in scripts/brand-types.ts (or " +
          "brand.config.ts) and re-run `pnpm brand:apply`, then commit both " +
          "files together. Do not hand-edit metadata.ts.",
      ).toBe(originalBytes);
    } finally {
      // Always restore — never leave the working tree dirty.
      copyFileSync(tmpPath, METADATA_PATH);
    }
  });

  it("brand:apply is idempotent — a second run produces the same bytes as the first", () => {
    // Backup + run once to land an authoritative state, then run again
    // and assert the second run did not change the file.
    const tmpPath = join(tmpdir(), `brand-metadata-idempotent-${Date.now()}.ts`);
    copyFileSync(METADATA_PATH, tmpPath);

    try {
      execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });
      const firstRun = readFileSync(METADATA_PATH, "utf8");

      execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });
      const secondRun = readFileSync(METADATA_PATH, "utf8");

      expect(
        secondRun,
        "`pnpm brand:apply` is not idempotent — running it twice produced " +
          "different output. Inspect scripts/brand-apply.ts and Biome's " +
          "auto-fix behavior on the generated file.",
      ).toBe(firstRun);
    } finally {
      copyFileSync(tmpPath, METADATA_PATH);
    }
  });
});
