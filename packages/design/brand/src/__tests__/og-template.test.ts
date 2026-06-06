import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * OG template governance tests:
 * 1. No CSS var() calls (Satori does not resolve them)
 * 2. No hardcoded "Nebutra" brand literal (derive from brand.name prop)
 * 3. Both default palettes are present and well-formed
 * 4. OgTemplate is exported correctly
 */

// vitest runs from packages/design/brand (cwd)
const brandRoot = resolve(process.cwd());
const ogTemplatePath = join(brandRoot, "src/og/og-template.tsx");

describe("og-template.tsx governance", () => {
  it("contains no CSS var() calls in style values — Satori cannot resolve CSS custom properties", () => {
    const src = readFileSync(ogTemplatePath, "utf-8");

    // Satori does NOT resolve var(--...) — all colors must be explicit hex/rgba.
    // Strip single-line and block comments first, then check remaining code.
    const strippedSrc = src
      // Remove block comments (/** ... */ and /* ... */)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Remove single-line comments (// ...)
      .replace(/\/\/.*$/gm, "");

    expect(
      strippedSrc.includes("var(--"),
      "og-template.tsx must not use CSS custom properties (var(--...)) in style values — Satori cannot resolve them. Use explicit hex/rgba values.",
    ).toBe(false);
  });

  it('contains no hardcoded "Nebutra" brand literal — derive from brandName prop', () => {
    const src = readFileSync(ogTemplatePath, "utf-8");

    // The brandName must come from props, never hardcoded.
    // Comments referencing the name are OK but string literals in JSX/style are not.
    const jsxLiteralPattern = />Nebutra</;
    const stringLiteralPattern = /"Nebutra"[^:]/; // exclude import paths

    expect(
      jsxLiteralPattern.test(src),
      'og-template.tsx must not contain JSX text ">Nebutra<" — use the brandName prop instead',
    ).toBe(false);

    expect(
      stringLiteralPattern.test(src),
      'og-template.tsx must not contain "Nebutra" as a string literal — use the brandName prop instead',
    ).toBe(false);
  });

  it("exports OG_PALETTE_DARK with required color fields", async () => {
    const { OG_PALETTE_DARK } = await import("../og/og-template");

    expect(typeof OG_PALETTE_DARK.bg).toBe("string");
    expect(typeof OG_PALETTE_DARK.title).toBe("string");
    expect(typeof OG_PALETTE_DARK.accent).toBe("string");
    expect(typeof OG_PALETTE_DARK.subtitle).toBe("string");
    expect(typeof OG_PALETTE_DARK.grid).toBe("string");
    expect(typeof OG_PALETTE_DARK.glowA).toBe("string");
    expect(typeof OG_PALETTE_DARK.glowB).toBe("string");

    // Must not be CSS vars
    expect(OG_PALETTE_DARK.bg.startsWith("var(")).toBe(false);
    expect(OG_PALETTE_DARK.accent.startsWith("var(")).toBe(false);
  });

  it("exports OgTemplate as a function", async () => {
    const { OgTemplate } = await import("../og/og-template");
    expect(typeof OgTemplate).toBe("function");
  });
});
