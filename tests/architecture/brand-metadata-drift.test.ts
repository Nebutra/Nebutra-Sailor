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
const CORE_JSON_PATH = join(ROOT, "packages/design/design-tokens/tokens/core.json");
const STYLES_CSS_PATH = join(ROOT, "packages/design/tokens/styles.css");

describe("brand metadata drift", () => {
  it("metadata.ts is byte-identical to what `pnpm brand:apply` would emit", {
    timeout: 120_000,
  }, () => {
    // H2: since brand:apply now also writes core.json, back it up and restore
    // it in the finally block alongside metadata.ts.
    const tmpMetadata = join(tmpdir(), `brand-metadata-drift-${Date.now()}.ts`);
    const tmpCoreJson = join(tmpdir(), `brand-core-drift-${Date.now()}.json`);

    copyFileSync(METADATA_PATH, tmpMetadata);
    copyFileSync(CORE_JSON_PATH, tmpCoreJson);
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
      copyFileSync(tmpMetadata, METADATA_PATH);
      copyFileSync(tmpCoreJson, CORE_JSON_PATH);
    }
  });

  it("brand:apply is idempotent — a second run produces the same bytes as the first (metadata.ts AND core.json)", {
    timeout: 120_000,
  }, () => {
    // H1: this test runs brand:apply twice (each run triggers runDesignTokensBuild ~15-30s).
    // H2: back up both metadata.ts and core.json; restore both in finally.
    const tmpMetadata = join(tmpdir(), `brand-metadata-idempotent-${Date.now()}.ts`);
    const tmpCoreJson = join(tmpdir(), `brand-core-idempotent-${Date.now()}.json`);

    copyFileSync(METADATA_PATH, tmpMetadata);
    copyFileSync(CORE_JSON_PATH, tmpCoreJson);

    try {
      execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });
      const metadataFirstRun = readFileSync(METADATA_PATH, "utf8");
      const coreJsonFirstRun = readFileSync(CORE_JSON_PATH, "utf8");

      execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });
      const metadataSecondRun = readFileSync(METADATA_PATH, "utf8");
      const coreJsonSecondRun = readFileSync(CORE_JSON_PATH, "utf8");

      expect(
        metadataSecondRun,
        "`pnpm brand:apply` is not idempotent — running it twice produced " +
          "different metadata.ts output. Inspect scripts/brand-apply.ts and Biome's " +
          "auto-fix behavior on the generated file.",
      ).toBe(metadataFirstRun);

      expect(
        coreJsonSecondRun,
        "`pnpm brand:apply` is not idempotent — running it twice produced " +
          "different core.json output. Check deriveColorNodes key ordering in " +
          "scripts/brand-apply.ts (nebutra-neutral $description placement).",
      ).toBe(coreJsonFirstRun);
    } finally {
      copyFileSync(tmpMetadata, METADATA_PATH);
      copyFileSync(tmpCoreJson, CORE_JSON_PATH);
    }
  });

  describe("updateCoreJson integration", () => {
    it("brand:apply writes nebutra-blue/cyan/neutral into core.json from DEFAULT_BRAND.colors", {
      timeout: 120_000,
    }, () => {
      const tmpCoreJson = join(tmpdir(), `brand-core-integration-${Date.now()}.json`);
      const tmpMetadata = join(tmpdir(), `brand-metadata-integration-${Date.now()}.ts`);

      copyFileSync(CORE_JSON_PATH, tmpCoreJson);
      copyFileSync(METADATA_PATH, tmpMetadata);

      try {
        execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });

        const coreAfter = JSON.parse(readFileSync(CORE_JSON_PATH, "utf8")) as {
          color: {
            "nebutra-blue": Record<
              string,
              { $value: string; $extensions?: Record<string, unknown> }
            >;
            "nebutra-cyan": Record<
              string,
              { $value: string; $extensions?: Record<string, unknown> }
            >;
            "nebutra-neutral": Record<string, { $value: string }>;
            "nebutra-gray": Record<string, { $value: string }>;
            status: { success: { $value: string } };
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };

        // Blue 500 must equal DEFAULT_BRAND.colors.primary["500"] (lowercased).
        expect(coreAfter.color["nebutra-blue"]["500"].$value).toBe("#0033fe");
        // Cyan 500 must equal DEFAULT_BRAND.colors.accent["500"] (lowercased).
        expect(coreAfter.color["nebutra-cyan"]["500"].$value).toBe("#0bf1c3");
        // $extensions (display-p3) must be preserved on 500-stops.
        expect(
          (coreAfter.color["nebutra-blue"]["500"].$extensions as Record<string, string>)[
            "com.nebutra.display-p3"
          ],
        ).toBe("color(display-p3 0.03 0.19 0.99)");
        expect(
          (coreAfter.color["nebutra-cyan"]["500"].$extensions as Record<string, string>)[
            "com.nebutra.display-p3"
          ],
        ).toBe("color(display-p3 0.07 0.94 0.79)");
        // Non-brand keys must be untouched.
        expect(coreAfter.color["nebutra-gray"]["500"].$value).toBe("#737373");
        expect(coreAfter.color.status.success.$value).toBe("#22c55e");
      } finally {
        copyFileSync(tmpCoreJson, CORE_JSON_PATH);
        copyFileSync(tmpMetadata, METADATA_PATH);
      }
    });
  });

  describe("runDesignTokensBuild integration", () => {
    it("brand:apply triggers the design-tokens build — styles.css reflects the new core.json values", {
      timeout: 120_000,
    }, () => {
      // Strategy: mutate core.json nebutra-blue[50] to a sentinel value,
      // run brand:apply, assert the sentinel does NOT appear in styles.css
      // (because brand:apply overwrites core.json from DEFAULT_BRAND.colors
      // AND then triggers the Style Dictionary build which regenerates styles.css).
      const tmpCoreJson = join(tmpdir(), `brand-core-build-${Date.now()}.json`);
      const tmpStylesCss = join(tmpdir(), `brand-styles-build-${Date.now()}.css`);
      const tmpMetadata = join(tmpdir(), `brand-metadata-build-${Date.now()}.ts`);

      copyFileSync(CORE_JSON_PATH, tmpCoreJson);
      copyFileSync(STYLES_CSS_PATH, tmpStylesCss);
      copyFileSync(METADATA_PATH, tmpMetadata);

      // We do NOT mutate core.json directly — brand:apply will write it from
      // DEFAULT_BRAND.colors and then rebuild. If the build is wired correctly,
      // styles.css must contain the canonical brand color (#0033fe) after apply.
      try {
        execFileSync("pnpm", ["brand:apply"], { cwd: ROOT, stdio: "pipe" });

        const stylesAfter = readFileSync(STYLES_CSS_PATH, "utf8");
        // styles.css must contain the canonical primary brand color.
        expect(
          stylesAfter.toLowerCase().includes("#0033fe"),
          "styles.css must contain the canonical brand primary color #0033fe after brand:apply",
        ).toBe(true);
        // styles.css must contain the canonical accent color.
        expect(
          stylesAfter.toLowerCase().includes("#0bf1c3"),
          "styles.css must contain the canonical brand accent color #0bf1c3 after brand:apply",
        ).toBe(true);
      } finally {
        copyFileSync(tmpCoreJson, CORE_JSON_PATH);
        copyFileSync(tmpStylesCss, STYLES_CSS_PATH);
        copyFileSync(tmpMetadata, METADATA_PATH);
      }
    });
  });
});

// ─── Phase 3: metadata-helpers.ts has zero hardcoded brand literals ───────────

describe("metadata-helpers.ts source-text drift guard", () => {
  it("metadata-helpers.ts contains zero hardcoded Nebutra/nebutra.com literals", () => {
    const helpersSrc = readFileSync(
      join(ROOT, "packages/design/brand/src/metadata-helpers.ts"),
      "utf8",
    );

    // These patterns must NOT appear as raw string literals in the helper module.
    // All brand strings must be derived from the imported `brand` / `colors` objects.
    const banned = [
      /"Nebutra"/,
      /'Nebutra'/,
      /`Nebutra`/,
      /"nebutra\.com"/,
      /'nebutra\.com'/,
      /`nebutra\.com`/,
    ];

    for (const pattern of banned) {
      expect(
        pattern.test(helpersSrc),
        `metadata-helpers.ts must not contain literal matching ${pattern} — derive from brand object`,
      ).toBe(false);
    }
  });
});
