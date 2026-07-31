import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitBrandCss, emitGlobalSkinSelector } from "../emit-css";
import type { BrandPackage } from "../types";

function minimalBrand(
  overrides: Partial<BrandPackage> & Pick<BrandPackage, "id" | "darkDefault">,
): BrandPackage {
  return {
    name: overrides.name ?? overrides.id,
    version: "1.0.0",
    semantic: {
      background: "0 0% 100%",
      foreground: "0 0% 10%",
      card: "0 0% 100%",
      cardForeground: "0 0% 10%",
      popover: "0 0% 100%",
      popoverForeground: "0 0% 10%",
      primary: "220 90% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 96%",
      secondaryForeground: "0 0% 10%",
      muted: "0 0% 96%",
      mutedForeground: "0 0% 40%",
      accent: "0 0% 96%",
      accentForeground: "0 0% 10%",
      destructive: "0 72% 51%",
      destructiveForeground: "0 0% 100%",
      border: "0 0% 90%",
      input: "0 0% 100%",
      ring: "220 90% 50%",
    },
    recipe: {
      buttonDefault: "solid",
      density: "comfortable",
      radii: {
        button: "0.375rem",
        card: "0.75rem",
        badge: "9999px",
        input: "0.375rem",
        pill: "9999px",
      },
      elevationTokens: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        control: "0 0 #0000",
        raised: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      },
    },
    typography: { fontSans: "Inter, sans-serif" },
    ...overrides,
  };
}

describe("emitBrandCss darkDefault binding", () => {
  it("includes .dark only for darkDefault packs in global mode", () => {
    const dark = emitBrandCss(minimalBrand({ id: "linear-like", darkDefault: true }));
    assert.match(dark, /:root,\n\.dark,\nhtml\[data-brand="linear-like"\] \{/);

    const light = emitBrandCss(minimalBrand({ id: "stripe-like", darkDefault: false }));
    assert.match(light, /:root,\nhtml\[data-brand="stripe-like"\] \{/);
    assert.doesNotMatch(light, /\.dark/);
  });

  it("scoped mode never binds :root or .dark", () => {
    const css = emitBrandCss(minimalBrand({ id: "vanta", darkDefault: false }), { mode: "scoped" });
    assert.match(css, /html\[data-brand="vanta"\] \{/);
    assert.doesNotMatch(css, /:root/);
    assert.doesNotMatch(css, /\.dark/);
  });

  it("emitGlobalSkinSelector matches darkDefault contract", () => {
    assert.equal(emitGlobalSkinSelector("x", true), `:root,\n.dark,\nhtml[data-brand="x"] {`);
    assert.equal(emitGlobalSkinSelector("y", false), `:root,\nhtml[data-brand="y"] {`);
  });

  it("dual-mode packs emit separate light and dark color blocks", () => {
    const lightSemantic = minimalBrand({ id: "dual", darkDefault: false }).semantic;
    const darkSemantic = {
      ...lightSemantic,
      background: "0 0% 6%",
      foreground: "0 0% 98%",
      card: "0 0% 10%",
      primary: "220 90% 60%",
    };
    const css = emitBrandCss({
      ...minimalBrand({ id: "dual", darkDefault: false }),
      modes: {
        light: { semantic: lightSemantic },
        dark: { semantic: darkSemantic },
      },
    });
    assert.match(css, /dualMode=true/);
    assert.match(css, /:root,\nhtml\[data-brand="dual"\] \{/);
    assert.match(css, /\.dark,\nhtml\.dark\[data-brand="dual"\] \{/);
    assert.match(css, /--background: 0 0% 100%/); // light
    assert.match(css, /--background: 0 0% 6%/); // dark
    // light block must not list bare .dark in the same selector
    assert.doesNotMatch(css, /:root,\n\.dark,\nhtml\[data-brand="dual"\]/);
  });
});
