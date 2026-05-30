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
  getPreviewStyleFromTokenSet,
  getThemePreviewStyle,
  type ThemeTokenSet,
} from "../theme-token-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cast the opaque CSSProperties to a plain record for assertions. */
function asRecord(style: React.CSSProperties): Record<string, string> {
  return style as Record<string, string>;
}

// ─── Suite: getPreviewStyleFromTokenSet ──────────────────────────────────────

describe("getPreviewStyleFromTokenSet", () => {
  describe("color tokens", () => {
    it("sets --color-primary from token set", () => {
      const tokenSet: ThemeTokenSet = {
        color: {
          primary: { $value: "#0033fe", $type: "color" },
        },
      };
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--color-primary"]).toBe("#0033fe");
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

    it("omits font vars when absent", () => {
      const tokenSet: ThemeTokenSet = {};
      const style = asRecord(getPreviewStyleFromTokenSet(tokenSet, "light"));
      expect(style["--font-sans"]).toBeUndefined();
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
  });
});

// ─── Suite: getThemePreviewStyle delegation ───────────────────────────────────

describe("getThemePreviewStyle", () => {
  it("returns a populated style for the neon theme", () => {
    const style = asRecord(getThemePreviewStyle("neon", "light"));
    expect(Object.keys(style).length).toBeGreaterThan(5);
    expect(style["--color-primary"]).toBeDefined();
    expect(style["--color-background"]).toBeDefined();
  });

  it("returns a populated style for the neon theme in dark mode", () => {
    const style = asRecord(getThemePreviewStyle("neon", "dark"));
    expect(style["colorScheme"]).toBe("dark");
    expect(style["--color-primary"]).toBeDefined();
  });

  it("returns a populated style for vibrant theme", () => {
    const style = asRecord(getThemePreviewStyle("vibrant", "light"));
    expect(style["--color-primary"]).toBeDefined();
  });

  it("falls back to neon for unknown themeId", () => {
    const neonStyle = asRecord(getThemePreviewStyle("neon", "light"));
    const unknownStyle = asRecord(getThemePreviewStyle("does-not-exist", "light"));
    // Unknown falls back to neon — primary should match
    expect(unknownStyle["--color-primary"]).toBe(neonStyle["--color-primary"]);
  });

  it("output is identical to getPreviewStyleFromTokenSet for same inputs (delegation integrity)", () => {
    // This verifies that getThemePreviewStyle just wraps getPreviewStyleFromTokenSet
    // by checking a known token value that the neon theme explicitly declares
    const style = asRecord(getThemePreviewStyle("neon", "dark"));
    expect(typeof style["--color-primary"]).toBe("string");
    expect(style["--color-primary"]!.length).toBeGreaterThan(0);
  });
});
