import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Brand favicon completeness guard.
 *
 * `packages/design/brand/src/metadata.ts` declares 5 favicon asset paths in
 * `faviconAssets`. This test asserts that all 5 actually exist on disk — the
 * 4 generated ones (favicon.svg, apple-touch-icon.png, android-chrome-192x192.png,
 * android-chrome-512x512.png) are produced by `generate-favicons.ts` during
 * `pnpm brand:apply`.
 *
 * This test starts RED (4 files missing) until `generate-favicons.ts` is wired
 * into `brand:apply`. That is the M2 arch assertion called for in the plan.
 *
 * fontAssets paths existence is also checked here per M2 binding correction:
 * the `fontAssets` export in metadata.ts must not declare ghost paths.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BRAND_ASSETS_DIR = join(ROOT, "packages/design/brand/assets");

describe("brand favicon completeness", () => {
  it("all faviconAssets paths declared in metadata.ts exist on disk", () => {
    // These are the 5 paths declared in packages/design/brand/src/metadata.ts
    // faviconAssets — all 5 must exist after brand:apply runs generate-favicons.
    const expectedFavicons = [
      "favicon/favicon.ico",
      "favicon/favicon.svg",
      "favicon/apple-touch-icon.png",
      "favicon/android-chrome-192x192.png",
      "favicon/android-chrome-512x512.png",
    ];

    for (const relPath of expectedFavicons) {
      const fullPath = join(BRAND_ASSETS_DIR, relPath);
      expect(
        existsSync(fullPath),
        `faviconAssets declares "${relPath}" but the file does not exist at ${fullPath}. ` +
          "Run `pnpm brand:apply` to generate the favicon set via generate-favicons.ts.",
      ).toBe(true);
    }
  });

  it("fontAssets paths declared in metadata.ts exist on disk (M2 — no ghost paths)", () => {
    // Per M2 binding correction: must be an arch assertion, not just a JSDoc comment.
    // If the poppins/vivoSans paths in metadata.ts ever drift from what's on disk,
    // this test fails — fix by either adding the missing fonts or removing the paths.
    const expectedFonts = [
      // Poppins — subset used in OG images
      "fonts/poppins/Poppins-Thin.otf",
      "fonts/poppins/Poppins-Regular.otf",
      "fonts/poppins/Poppins-Bold.otf",
      // vivoSans — brand typeface
      "fonts/vivo-sans/vivoSans-Regular.ttf",
      "fonts/vivo-sans/vivoSans-Bold.ttf",
    ];

    for (const relPath of expectedFonts) {
      const fullPath = join(BRAND_ASSETS_DIR, relPath);
      expect(
        existsSync(fullPath),
        `fontAssets declares "${relPath}" but the file does not exist at ${fullPath}. ` +
          "Either add the font file or remove/update the fontAssets declaration in metadata.ts.",
      ).toBe(true);
    }
  });
});
