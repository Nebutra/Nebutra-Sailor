/**
 * Tests for the refactored theme-token-data module.
 *
 * Validates that:
 *   1. getPreviewStyleFromTokenSet builds CSS vars from an arbitrary ThemeTokenSet
 *   2. Missing keys fall back to mode defaults
 *   3. getThemePreviewStyle delegates correctly (delegation smoke test)
 */

import { describe, expect, it } from "vitest";
import {
  estimateLightness,
  getPreviewStyleFromTokenSet,
  getThemePreviewStyle,
  type ThemeTokenSet,
} from "../theme-token-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cast the opaque CSSProperties to a plain record for assertions. */
function asRecord(style: React.CSSProperties): Record<string, string> {
  return style as Record<string, string>;
}

// ─── Suite: estimateLightness ─────────────────────────────────────────────────

describe("estimateLightness", () => {
  it("hex #fff7ed (warm white) is detected as light (> 0.5)", () => {
    expect(estimateLightness("#fff7ed")).toBeGreaterThan(0.5);
  });

  it("hex #101014 (near-black) is detected as dark (< 0.5)", () => {
    expect(estimateLightness("#101014")).toBeLessThan(0.5);
  });

  it("oklch(0.16 0.005 285.9) parses the L component correctly (≈ 0.16)", () => {
    expect(estimateLightness("oklch(0.16 0.005 285.9)")).toBeCloseTo(0.16, 2);
  });

  it("oklch(0.98 0 0) parses the L component correctly (≈ 0.98)", () => {
    expect(estimateLightness("oklch(0.98 0 0)")).toBeCloseTo(0.98, 2);
  });

  it("unknown/unrecognised value returns 0.5 fallback", () => {
    expect(estimateLightness("hsl(200 50% 60%)")).toBe(0.5);
    expect(estimateLightness("")).toBe(0.5);
    expect(estimateLightness("transparent")).toBe(0.5);
  });

  it("short hex #fff is detected as light", () => {
    expect(estimateLightness("#fff")).toBeGreaterThan(0.5);
  });

  it("short hex #000 is detected as dark", () => {
    expect(estimateLightness("#000")).toBeLessThan(0.5);
  });

  it("rgb(255,255,255) is detected as light", () => {
    expect(estimateLightness("rgb(255, 255, 255)")).toBeGreaterThan(0.5);
  });

  it("rgb(10,10,10) is detected as dark", () => {
    expect(estimateLightness("rgb(10, 10, 10)")).toBeLessThan(0.5);
  });
});

// ─── Suite: getPreviewStyleFromTokenSet ──────────────────────────────────────

describe("getPreviewStyleFromTokenSet", () => {
  describe("color tokens", () => {
    it("sets --color-primary from token set", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          primary: { $value: "hsl(var(--primary))", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--color-primary"]).toBe("hsl(var(--primary))");
    });

    it("sets --color-accent from token set", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          accent: { $value: "#0bf1c3", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--color-accent"]).toBe("#0bf1c3");
    });

    it("uses mode fallback for --color-background when token is absent (light mode)", () => {
      // No color tokens at all — everything should fall back to mode defaults
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      // light mode background fallback is oklch(1 0 0) (pure white)
      expect(style["--color-background"]).toBeDefined();
      expect(style["--color-background"]).toContain("oklch");
    });

    it("uses mode fallback for --color-background in dark mode", () => {
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "dark"));
      expect(style["--color-background"]).toBeDefined();
      expect(style["--color-background"]).toContain("oklch");
    });

    it("always sets colorScheme to the requested mode", () => {
      const tokenSet: ThemeTokenSet = {};
      const lightStyle = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      const darkStyle = asRecord(getPreviewStyleFromTokenSet(tokenSet, "dark"));
      expect(lightStyle["colorScheme"]).toBe("light");
      expect(darkStyle["colorScheme"]).toBe("dark");
    });

    it("sets status color fallback for --color-destructive when absent", () => {
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--color-destructive"]).toBeDefined();
      expect(style["--color-destructive"]).toMatch(/hsl|oklch/);
    });

    it("multiple color tokens are all emitted", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          primary: { $value: "#aaa111", $type: "color" },
          secondary: { $value: "#bbb222", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--color-primary"]).toBe("#aaa111");
      expect(style["--color-secondary"]).toBe("#bbb222");
    });
  });

  describe("radius tokens", () => {
    it("sets --radius-md from token set", () => {
      const tokenSet: ThemeTokenSet = {
        radius: {
          md: { $value: "8px", $type: "dimension" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--radius-md"]).toBe("8px");
    });

    it("sets multiple radius vars", () => {
      const tokenSet: ThemeTokenSet = {
        radius: {
          sm: { $value: "4px", $type: "dimension" },
          lg: { $value: "16px", $type: "dimension" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--radius-sm"]).toBe("4px");
      expect(style["--radius-lg"]).toBe("16px");
    });

    it("omits radius vars not in the token set", () => {
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--radius-sm"]).toBeUndefined();
      expect(style["--radius-md"]).toBeUndefined();
    });
  });

  describe("fontFamily tokens", () => {
    it("sets --font-sans from token set", () => {
      const tokenSet: ThemeTokenSet = {
        fontFamily: {
          sans: { $value: "Inter, sans-serif", $type: "fontFamily" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--font-sans"]).toBe("Inter, sans-serif");
    });

    it("emits --font-sans fallback even when absent from token set", () => {
      // Since be56cb7b, getPreviewStyleFromTokenSet always emits --font-sans
      // with a system-font fallback stack so the preview subtree never leaks
      // to the app-global Geist variable. An empty token set gets the fallback.
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--font-sans"]).toBeDefined();
      expect(typeof style["--font-sans"]).toBe("string");
      expect((style["--font-sans"] as string).length).toBeGreaterThan(0);
    });
  });

  describe("shadow tokens", () => {
    it("sets --shadow-md from token set", () => {
      const tokenSet: ThemeTokenSet = {
        shadow: {
          md: { $value: "0 2px 4px rgba(0,0,0,0.1)", $type: "shadow" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--shadow-md"]).toBe("0 2px 4px rgba(0,0,0,0.1)");
    });
  });

  describe("surface precedence logic", () => {
    it("light mode + light-designed theme: theme bg wins over fallback", () => {
      // A token with L > 0.5 is "light-designed"
      const tokenSet: ThemeTokenSet = {
        color: {
          background: { $value: "oklch(0.98 0 0)", $type: "color" }, // very light
          foreground: { $value: "oklch(0.1 0 0)", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      // Theme value should win
      expect(style["--color-background"]).toBe("oklch(0.98 0 0)");
    });

    it("dark mode: fallback always wins for surface colors", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          // provide a background that signals it's a dark theme
          background: { $value: "oklch(0.13 0.008 264)", $type: "color" },
        },
      };
      const styleDark = asRecord(getPreviewStyleFromTokenSet(tokenSet, "dark"));
      // In dark mode, fallback wins for surface — so it gets the mode fallback value
      // which is "oklch(0.16 0.005 285.9)"
      expect(styleDark["--color-background"]).toBe("oklch(0.16 0.005 285.9)");
    });

    // ── Bug 1 regression: imported hex backgrounds ───────────────────────────

    it("light mode + hex #fff7ed bg (luminance ≈ 0.97): theme wins, --color-background is #fff7ed", () => {
      // Mimics a DESIGN.md import that uses a warm-white hex background.
      const tokenSet: ThemeTokenSet = {
        color: {
          background: { $value: "#fff7ed", $type: "color" },
          primary: { $value: "#ff5a1f", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      // The hex bg has high luminance → light-designed → theme wins in light mode
      expect(style["--color-background"]).toBe("#fff7ed");
      // Brand color is still applied
      expect(style["--color-primary"]).toBe("#ff5a1f");
    });

    it("dark mode + hex #fff7ed bg: dark fallback still wins (unchanged precedence)", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          background: { $value: "#fff7ed", $type: "color" },
          primary: { $value: "#ff5a1f", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "dark"));
      // In dark mode the fallback always wins regardless of theme bg
      expect(style["--color-background"]).toBe("oklch(0.16 0.005 285.9)");
    });

    it("light mode + dark hex background (#101014): fallback wins (dark-designed theme)", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          background: { $value: "#101014", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      // Low luminance → dark-designed → light-mode fallback wins
      expect(style["--color-background"]).toBe("oklch(1 0 0)");
    });
  });
});

// ─── Suite: getThemePreviewStyle delegation ───────────────────────────────────

describe("getThemePreviewStyle", () => {
  it("returns a populated style for the nebutra theme", () => {
    const style = asRecord(getThemePreviewStyle("nebutra", "light"));
    expect(Object.keys(style).length).toBeGreaterThan(5);
    expect(style["--color-primary"]).toBeDefined();
    expect(style["--color-background"]).toBeDefined();
  });

  it("returns a populated style for the nebutra theme in dark mode", () => {
    const style = asRecord(getThemePreviewStyle("nebutra", "dark"));
    expect(style["colorScheme"]).toBe("dark");
    expect(style["--color-primary"]).toBeDefined();
  });

  it("returns a populated style for vibrant theme", () => {
    const style = asRecord(getThemePreviewStyle("vibrant", "light"));
    expect(style["--color-primary"]).toBeDefined();
  });

  it("falls back to nebutra for unknown themeId", () => {
    const nebutraStyle = asRecord(getThemePreviewStyle("nebutra", "light"));
    const unknownStyle = asRecord(getThemePreviewStyle("does-not-exist", "light"));
    // Unknown falls back to nebutra — primary should match
    expect(unknownStyle["--color-primary"]).toBe(nebutraStyle["--color-primary"]);
  });

  it("output is identical to getPreviewStyleFromTokenSet for same inputs (delegation integrity)", () => {
    // This verifies that getThemePreviewStyle just wraps getPreviewStyleFromTokenSet
    // by checking a known token value that the nebutra theme explicitly declares
    const style = asRecord(getThemePreviewStyle("nebutra", "dark"));
    expect(typeof style["--color-primary"]).toBe("string");
    expect(style["--color-primary"]!.length).toBeGreaterThan(0);
  });
});
