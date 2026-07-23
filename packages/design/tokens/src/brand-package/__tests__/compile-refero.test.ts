import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileReferoTokens } from "../compile-refero";
import { hexToHslChannels } from "../hex-to-hsl";

describe("hexToHslChannels", () => {
  it("converts green", () => {
    assert.match(hexToHslChannels("#0ae448"), /^\d+ \d+% \d+%$/);
  });
});

describe("compileReferoTokens — GSAP", () => {
  it("produces gradient-stroke recipe and category extensions", () => {
    const result = compileReferoTokens({
      id: "gsap",
      designMd: "gradient-stroked CTA pill outlined-only",
      tokens: {
        color: {
          "just-black": { $value: "#0e100f", $type: "color" },
          "surface-cream": { $value: "#fffce1", $type: "color" },
          "surface-50": { $value: "#7c7c6f", $type: "color" },
          "surface-25": { $value: "#42433d", $type: "color" },
          "off-black": { $value: "#191919", $type: "color" },
          "shockingly-green": { $value: "#0ae448", $type: "color" },
          pink: { $value: "#fec5fb", $type: "color" },
          orangey: { $value: "#ff8709", $type: "color" },
          lilac: { $value: "#9d95ff", $type: "color" },
          blue: { $value: "#00bae2", $type: "color" },
        },
        radius: {
          full: { $value: "100px", $type: "dimension" },
          lg: { $value: "8px", $type: "dimension" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Gsap", url: "https://gsap.com" },
        },
      },
    });
    assert.equal(result.brand.recipe.buttonDefault, "gradient-stroke");
    assert.equal(result.brand.recipe.buttonRadius, "100px");
    assert.equal(result.brand.recipe.elevation, "none");
    assert.ok(result.brand.extensions?.categories?.scroll);
    assert.match(result.css, /--btn-default-bg: transparent/);
    assert.match(result.css, /--btn-default-stroke-gradient:/);
    assert.match(result.css, /--btn-default-border-width: 1\.5px/);
    assert.match(result.css, /@font-face/);
    assert.match(result.css, /zone-marketing/);
    assert.equal(result.brand.zones?.marketing?.display?.fontSize, "224px");
    assert.ok((result.brand.typography.faces?.length ?? 0) > 0);
    assert.ok(result.warnings.some((w) => w.includes("shockingly-green")));
  });
});

describe("compileReferoTokens — Linear", () => {
  it("produces solid CTA recipe", () => {
    const result = compileReferoTokens({
      id: "linear",
      tokens: {
        color: {
          void: { $value: "#08090a", $type: "color" },
          carbon: { $value: "#0f1011", $type: "color" },
          graphite: { $value: "#23252a", $type: "color" },
          paper: { $value: "#ffffff", $type: "color" },
          "acid-lime": { $value: "#e4f222", $type: "color" },
        },
      },
    });
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.match(result.css, /--btn-default-bg: hsl\(var\(--primary\)\)/);
    assert.match(result.css, /--btn-default-border-width: 0px/);
  });
});

describe("validateBrandPackage", () => {
  it("accepts compiled packages", async () => {
    const { validateBrandPackage } = await import("../validate");
    const result = compileReferoTokens({
      id: "linear",
      tokens: {
        color: {
          void: { $value: "#08090a", $type: "color" },
          paper: { $value: "#ffffff", $type: "color" },
          "acid-lime": { $value: "#e4f222", $type: "color" },
        },
      },
    });
    const v = validateBrandPackage(result.brand);
    assert.equal(v.ok, true);
  });
});
