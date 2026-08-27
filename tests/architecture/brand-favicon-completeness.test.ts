import { existsSync, readFileSync, statSync } from "node:fs";
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

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasPngMagic(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC);
}

describe("brand favicon completeness", () => {
  it("all faviconAssets paths declared in metadata.ts exist on disk and are non-empty", () => {
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

      // Guard against zero-byte placeholders — a corrupt file is worse than a missing one
      // because it silently breaks Next.js manifest, PWA install, and Lighthouse audits.
      const size = statSync(fullPath).size;
      expect(
        size,
        `faviconAssets file "${relPath}" is zero bytes — this is a corrupt placeholder. ` +
          "Run `pnpm brand:apply` to regenerate the file with valid content.",
      ).toBeGreaterThan(0);
    }
  });

  it("PNG favicon assets have valid PNG magic bytes", () => {
    // Catch cases where a file exists and is non-empty but is not a valid PNG
    // (e.g. a raw SVG written into a .png path, or a truncated render).
    const pngFavicons = [
      "favicon/apple-touch-icon.png",
      "favicon/android-chrome-192x192.png",
      "favicon/android-chrome-512x512.png",
    ];

    for (const relPath of pngFavicons) {
      const fullPath = join(BRAND_ASSETS_DIR, relPath);
      if (!existsSync(fullPath)) continue; // existence checked in the previous test

      const buf = readFileSync(fullPath);
      expect(
        hasPngMagic(buf),
        `"${relPath}" does not start with PNG magic bytes (89 50 4E 47). ` +
          "The file may be corrupt. Run `pnpm brand:apply` to regenerate it.",
      ).toBe(true);
    }
  });

  it("fontAssets paths declared in metadata.ts exist on disk (M2 — no ghost paths)", () => {
    // Per M2 binding correction: must be an arch assertion, not just a JSDoc comment.
    // If the poppins paths in metadata.ts ever drift from what's on disk,
    // this test fails — fix by either adding the missing fonts or removing the paths.
    const expectedFonts = [
      // Poppins — subset used in OG images
      "fonts/poppins/Poppins-Thin.otf",
      "fonts/poppins/Poppins-Regular.otf",
      "fonts/poppins/Poppins-Bold.otf",
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
