import { describe, expect, it } from "vitest";
import {
  compileBrandFromTokenSets,
  mergeTokenTrees,
  tokenSetsToReferoShape,
} from "../serialize/to-brand-package";
import type { DesignTokenSet } from "../types";

describe("to-brand-package", () => {
  it("merges token trees with later sets winning", () => {
    const a = {
      color: { primary: { $value: "#111111", $type: "color" } },
    };
    const b = {
      color: { primary: { $value: "#e4f222", $type: "color" } },
    };
    const merged = mergeTokenTrees([a, b]);
    expect((merged.color as { primary: { $value: string } }).primary.$value).toBe("#e4f222");
  });

  it("compiles linear-like refero color set into solid brand package", () => {
    const sets: DesignTokenSet[] = [
      {
        name: "refero",
        relativePath: "refero.json",
        tokens: {
          color: {
            void: { $value: "#08090a", $type: "color" },
            paper: { $value: "#ffffff", $type: "color" },
            "acid-lime": { $value: "#e4f222", $type: "color" },
            carbon: { $value: "#0f1011", $type: "color" },
            graphite: { $value: "#23252a", $type: "color" },
          },
          $extensions: {
            "com.refero.extraction": { siteName: "Linear" },
          },
        },
      },
    ];
    const shape = tokenSetsToReferoShape(sets);
    expect(shape.color).toBeTruthy();
    const result = compileBrandFromTokenSets(sets, { id: "linear" });
    expect(result.brand.id).toBe("linear");
    expect(result.brand.recipe.buttonDefault).toBe("solid");
    expect(result.css).toContain("@font-face");
    expect(result.css).toContain("zone-product");
  });

  it("compiles gsap-like set with zones and font faces", () => {
    const sets: DesignTokenSet[] = [
      {
        name: "gsap",
        relativePath: "gsap.json",
        tokens: {
          color: {
            "just-black": { $value: "#0e100f", $type: "color" },
            "surface-cream": { $value: "#fffce1", $type: "color" },
            "shockingly-green": { $value: "#0ae448", $type: "color" },
            "surface-25": { $value: "#42433d", $type: "color" },
            "off-black": { $value: "#191919", $type: "color" },
          },
          $extensions: {
            "com.refero.extraction": { siteName: "Gsap" },
          },
        },
      },
    ];
    const result = compileBrandFromTokenSets(sets, {
      id: "gsap",
      designMd: "gradient-stroked CTA outlined-only",
    });
    expect(result.brand.recipe.buttonDefault).toBe("gradient-stroke");
    expect(result.brand.zones?.marketing?.display?.fontSize).toBe("224px");
    expect(result.brand.typography.faces?.length).toBeGreaterThan(0);
    expect(result.css).toContain('data-zone="marketing"');
  });
});
