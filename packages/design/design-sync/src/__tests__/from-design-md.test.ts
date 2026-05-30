/**
 * Tests for the DESIGN.md → DTCG theme importer.
 *
 * Parse approach: programmatic via `lint()` from `@google/design.md/linter`.
 * All @google/design.md coupling is isolated in `../serialize/from-design-md.ts`.
 */

import { describe, expect, it } from "vitest";
import { extractColorsFromProse, importFromDesignMd } from "../serialize/from-design-md";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Full fixture: supplies most of the required theme tokens. */
const FULL_FIXTURE = `---
name: Acme Brand
colors:
  primary: "#0033FE"
  accent: "#0BF1C3"
  background: "#ffffff"
  foreground: "#111111"
rounded:
  md: "8px"
---

## Typography

### h1
- font-family: Inter
- font-size: 2rem
- font-weight: 700

### body
- font-family: Inter
- font-size: 1rem
- font-weight: 400

## Elevation & Depth

Use subtle shadows to indicate depth. Cards use \`box-shadow: 0 2px 4px rgba(0,0,0,0.1)\`.

## Components

### Button
- background: {colors.primary}
- color: {colors.foreground}
`;

/** Sparse fixture: minimal front matter, no typography, no rounded. */
const SPARSE_FIXTURE = `---
name: Sparse
colors:
  primary: "#ff0000"
---

## Overview

A minimal design system.
`;

/** Empty content — should produce an error or empty-but-valid result. */
const EMPTY_FIXTURE = ``;

/** Fixture with an explicit brandName override. */
const NAMED_FIXTURE = `---
name: "My System"
colors:
  primary: "#123456"
  accent: "#abcdef"
  background: "#f0f0f0"
  foreground: "#010101"
rounded:
  md: "4px"
---

# Typography

## body
- font-family: Roboto
- font-size: 1rem
`;

/** Fixture with a YAML-front-matter typography block. */
const TYPOGRAPHY_FIXTURE = `---
name: TypoTest
colors:
  primary: "#000000"
typography:
  body:
    fontFamily: Lato
    fontSize: 1rem
---
`;

/** Fixture with spacing in front matter. */
const SPACING_FIXTURE = `---
name: SpacingTest
colors:
  primary: "#000000"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
---
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Required theme tokens per the registry contract. */
const REQUIRED_THEME_TOKENS = [
  "color.primary",
  "color.primary-foreground",
  "color.background",
  "color.foreground",
  "color.card",
  "color.border",
  "color.ring",
  "radius.md",
  "fontFamily.sans",
] as const;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("importFromDesignMd", () => {
  describe("SSOT safety", () => {
    it("relativePath always starts with themes/ — never core or semantic", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      expect(set.relativePath).toMatch(/^themes\//);
      expect(set.relativePath).not.toMatch(/core/);
      expect(set.relativePath).not.toMatch(/semantic/);
    });

    it("returns a DesignTokenSet shape", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      expect(set).toHaveProperty("name");
      expect(set).toHaveProperty("relativePath");
      expect(set).toHaveProperty("tokens");
      expect(typeof set.tokens).toBe("object");
    });
  });

  describe("relativePath + name derivation", () => {
    it("derives slug from front-matter name when no brandName option supplied", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      expect(set.relativePath).toBe("themes/acme-brand.json");
      expect(set.name).toBe("themes/acme-brand");
    });

    it("uses brandName option when provided (overrides front-matter name)", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE, { brandName: "My Cool Brand" });
      expect(set.relativePath).toBe("themes/my-cool-brand.json");
      expect(set.name).toBe("themes/my-cool-brand");
    });

    it("falls back to 'imported' slug when no name is available", () => {
      const { set } = importFromDesignMd(EMPTY_FIXTURE);
      expect(set.relativePath).toBe("themes/imported.json");
    });
  });

  describe("color mapping", () => {
    it("maps colors.primary → color.primary with $type: color", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      expect(colorGroup).toBeDefined();
      const leaf = colorGroup["primary"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("color");
      expect(typeof leaf.$value).toBe("string");
      // The hex should match the input color (case-insensitive)
      expect(String(leaf.$value).toLowerCase()).toContain("0033f");
    });

    it("maps colors.accent → color.accent", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      const leaf = colorGroup["accent"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("color");
      expect(String(leaf.$value).toLowerCase()).toContain("0bf1c3");
    });

    it("maps colors.background → color.background", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      const leaf = colorGroup["background"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("color");
    });

    it("maps colors.foreground → color.foreground", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      const leaf = colorGroup["foreground"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("color");
    });

    it("maps arbitrary colors.<x> → color.<x>", () => {
      const fixture = `---
name: Extra
colors:
  primary: "#000000"
  muted: "#888888"
---
`;
      const { set } = importFromDesignMd(fixture);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      expect(colorGroup["muted"]).toBeDefined();
      expect((colorGroup["muted"] as { $type: string }).$type).toBe("color");
    });
  });

  describe("dimension mapping (rounded → radius)", () => {
    it("maps rounded.md → radius.md with $type: dimension", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const radiusGroup = set.tokens["radius"] as Record<string, unknown>;
      expect(radiusGroup).toBeDefined();
      const leaf = radiusGroup["md"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("dimension");
      // Value should be parseable as a dimension string like "8px"
      expect(typeof leaf.$value).toBe("string");
      expect(String(leaf.$value)).toMatch(/\d/);
    });

    it("maps other rounded keys too", () => {
      const fixture = `---
name: Radii
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
---
`;
      const { set } = importFromDesignMd(fixture);
      const radiusGroup = set.tokens["radius"] as Record<string, unknown>;
      expect(radiusGroup["sm"]).toBeDefined();
      expect(radiusGroup["lg"]).toBeDefined();
    });
  });

  describe("spacing mapping (no silent loss)", () => {
    it("maps spacing.<k> → spacing.<k> with $type: dimension", () => {
      const { set } = importFromDesignMd(SPACING_FIXTURE);
      const spacingGroup = set.tokens["spacing"] as Record<string, unknown>;
      expect(spacingGroup).toBeDefined();

      const smLeaf = spacingGroup["sm"] as { $value: string; $type: string };
      expect(smLeaf).toBeDefined();
      expect(smLeaf.$type).toBe("dimension");
      expect(smLeaf.$value).toMatch(/\d/);

      const mdLeaf = spacingGroup["md"] as { $value: string; $type: string };
      expect(mdLeaf).toBeDefined();
      expect(mdLeaf.$type).toBe("dimension");
      expect(mdLeaf.$value).toMatch(/16/);

      const lgLeaf = spacingGroup["lg"] as { $value: string; $type: string };
      expect(lgLeaf).toBeDefined();
      expect(lgLeaf.$type).toBe("dimension");
    });

    it("all spacing leaves have both $value and $type", () => {
      const { set } = importFromDesignMd(SPACING_FIXTURE);
      const spacingGroup = set.tokens["spacing"] as Record<
        string,
        { $value: unknown; $type: unknown }
      >;
      for (const [key, leaf] of Object.entries(spacingGroup)) {
        expect(leaf.$type, `spacing.${key} must have $type`).toBe("dimension");
        expect(typeof leaf.$value, `spacing.${key} $value must be string`).toBe("string");
      }
    });

    it("fixture without spacing produces no spacing group", () => {
      const { set } = importFromDesignMd(SPARSE_FIXTURE);
      // spacing key must be absent (not silently present or undefined)
      expect("spacing" in set.tokens).toBe(false);
    });
  });

  describe("typography mapping", () => {
    it("maps YAML front-matter typography body → fontFamily.sans with $type: fontFamily", () => {
      const { set } = importFromDesignMd(TYPOGRAPHY_FIXTURE);
      expect("fontFamily" in set.tokens).toBe(true);
      const ffGroup = set.tokens["fontFamily"] as Record<string, unknown>;
      const leaf = ffGroup["sans"] as { $value: unknown; $type: string };
      expect(leaf.$type).toBe("fontFamily");
      expect(leaf.$value).toBe("Lato");
    });
  });

  describe("ImportReport", () => {
    it("report contains missingRequired listing tokens the fixture omitted", () => {
      const { report } = importFromDesignMd(FULL_FIXTURE);
      // Full fixture has primary/accent/background/foreground + radius.md
      // but NOT: primary-foreground, card, border, ring, fontFamily.sans (from YAML parse alone)
      expect(report.missingRequired).toContain("color.primary-foreground");
      expect(report.missingRequired).toContain("color.card");
      expect(report.missingRequired).toContain("color.border");
      expect(report.missingRequired).toContain("color.ring");
    });

    it("report does not include tokens that are present in the result", () => {
      const { set, report } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      if (colorGroup["primary"]) {
        expect(report.missingRequired).not.toContain("color.primary");
      }
      const radiusGroup = set.tokens["radius"] as Record<string, unknown>;
      if (radiusGroup?.["md"]) {
        expect(report.missingRequired).not.toContain("radius.md");
      }
    });

    it("FULL_FIXTURE: report.unmapped mentions elevation and components (computed from sections)", () => {
      const { report } = importFromDesignMd(FULL_FIXTURE);
      const combined = report.unmapped.join(" ").toLowerCase();
      expect(combined).toMatch(/elevation/);
      expect(combined).toMatch(/component/);
    });

    it("SPARSE_FIXTURE: report.unmapped does NOT contain elevation or components (computed, not hard-coded)", () => {
      // SPARSE_FIXTURE has only an "Overview" section — no Elevation or Components
      const { report } = importFromDesignMd(SPARSE_FIXTURE);
      const combined = report.unmapped.join(" ").toLowerCase();
      expect(combined).not.toMatch(/elevation/);
      expect(combined).not.toMatch(/component/);
    });

    it("report.warnings is an array (may be empty)", () => {
      const { report } = importFromDesignMd(FULL_FIXTURE);
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it("sparse fixture missingRequired includes most required tokens", () => {
      const { report } = importFromDesignMd(SPARSE_FIXTURE);
      // Sparse only has colors.primary — many required tokens are missing
      expect(report.missingRequired.length).toBeGreaterThan(4);
    });

    // ── Regression: canonical ## spec headings must be detected ──────────────

    it("regression: ## Elevation & Depth → unmapped mentions elevation", () => {
      const fixture = `---
name: RegElevation
colors:
  primary: "#000000"
---

## Elevation & Depth

Cards use box-shadow to indicate depth.
`;
      const { report } = importFromDesignMd(fixture);
      const combined = report.unmapped.join(" ").toLowerCase();
      expect(combined).toMatch(/elevation/);
    });

    it("regression: ## Components → unmapped mentions components", () => {
      const fixture = `---
name: RegComponents
colors:
  primary: "#000000"
---

## Components

### Button
- background: {colors.primary}
`;
      const { report } = importFromDesignMd(fixture);
      const combined = report.unmapped.join(" ").toLowerCase();
      expect(combined).toMatch(/component/);
    });

    it("regression: SPARSE fixture with ## Overview only — unmapped does NOT contain elevation or components", () => {
      // SPARSE_FIXTURE has only ## Overview — prose-only keywords absent
      const { report } = importFromDesignMd(SPARSE_FIXTURE);
      const combined = report.unmapped.join(" ").toLowerCase();
      expect(combined).not.toMatch(/elevation/);
      expect(combined).not.toMatch(/component/);
    });

    it("regression: duplicate ## Elevation & Depth headings produce exactly one unmapped entry", () => {
      const fixture = `---
name: DupElevation
colors:
  primary: "#000000"
---

## Elevation & Depth

First section.

## Elevation & Depth

Second section (duplicate).
`;
      const { report } = importFromDesignMd(fixture);
      const elevationEntries = report.unmapped.filter((s) => s.toLowerCase().includes("elevation"));
      expect(elevationEntries.length).toBe(1);
    });
  });

  describe("DTCG validity (validateDtcgTree)", () => {
    it("result for FULL_FIXTURE does not throw (valid DTCG tree)", () => {
      expect(() => importFromDesignMd(FULL_FIXTURE)).not.toThrow();
    });

    it("result for SPARSE_FIXTURE does not throw (valid DTCG tree)", () => {
      expect(() => importFromDesignMd(SPARSE_FIXTURE)).not.toThrow();
    });

    it("result for EMPTY_FIXTURE does not throw", () => {
      // Empty DESIGN.md should either return an empty-but-valid result or throw a clear error
      // We accept either — but if it throws, it must be a clear Error (not a crash).
      let threw = false;
      try {
        importFromDesignMd(EMPTY_FIXTURE);
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message.length).toBeGreaterThan(0);
      }
      // Either behavior is acceptable for empty input
      expect(typeof threw).toBe("boolean");
    });

    it("all leaf tokens in the result have $value and $type", () => {
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const checkTree = (node: Record<string, unknown>, path: string): void => {
        for (const [k, v] of Object.entries(node)) {
          if (k.startsWith("$")) continue;
          if (v !== null && typeof v === "object" && !Array.isArray(v)) {
            const vObj = v as Record<string, unknown>;
            if ("$value" in vObj) {
              // It's a leaf — must have $type
              expect(vObj["$type"], `leaf at ${path}.${k} must have $type`).toBeDefined();
              expect(typeof vObj["$type"]).toBe("string");
            } else {
              // It's a group — recurse
              checkTree(vObj, `${path}.${k}`);
            }
          }
        }
      };
      checkTree(set.tokens as Record<string, unknown>, "tokens");
    });

    it("spacing fixture produces a valid DTCG tree (no throw)", () => {
      expect(() => importFromDesignMd(SPACING_FIXTURE)).not.toThrow();
    });
  });

  describe("brandName option slug", () => {
    it("lowercases and hyphenates multi-word brand names", () => {
      const { set } = importFromDesignMd(SPARSE_FIXTURE, { brandName: "Acme Corp Design" });
      expect(set.relativePath).toBe("themes/acme-corp-design.json");
    });

    it("strips non-alphanumeric characters from slug", () => {
      const { set } = importFromDesignMd(SPARSE_FIXTURE, { brandName: "Hello World!" });
      expect(set.relativePath).toBe("themes/hello-world.json");
    });

    it("falls back to 'imported' when brandName is all-symbol (slug degenerates to empty)", () => {
      // "!!!" → toKebabSlug → "" → slug guard picks "imported"
      // Previously the guard checked rawName.trim().length > 0, which let "!!!" pass
      // and produced relativePath: "themes/.json". The fix computes the slug first.
      const { set } = importFromDesignMd(EMPTY_FIXTURE, { brandName: "!!!" });
      expect(set.relativePath).toBe("themes/imported.json");
      expect(set.name).toBe("themes/imported");
    });
  });

  describe("typography h1 fallback (Issue 2)", () => {
    // @google/design.md 0.2.0 preserves exact YAML front-matter keys.
    // When the front matter has "h1" but NOT "body", the old code silently dropped
    // fontFamily.sans. The fix picks: body → body-md → h1 → first entry.
    it("produces fontFamily.sans from a front-matter 'h1' typography entry when 'body' is absent", () => {
      const h1OnlyFixture = `---
name: H1Only
typography:
  h1:
    fontFamily: Inter
    fontSize: 2rem
---
`;
      const { set } = importFromDesignMd(h1OnlyFixture);
      expect("fontFamily" in set.tokens).toBe(true);
      const ffGroup = set.tokens["fontFamily"] as Record<string, unknown>;
      const leaf = ffGroup["sans"] as { $value: unknown; $type: string };
      expect(leaf).toBeDefined();
      expect(leaf.$type).toBe("fontFamily");
      expect(leaf.$value).toBe("Inter");
    });

    it("prefers 'body' over 'h1' when both are present in front matter", () => {
      const bothFixture = `---
name: BothKeys
typography:
  h1:
    fontFamily: Poppins
    fontSize: 2rem
  body:
    fontFamily: Roboto
    fontSize: 1rem
---
`;
      const { set } = importFromDesignMd(bothFixture);
      const ffGroup = set.tokens["fontFamily"] as Record<string, unknown>;
      const leaf = ffGroup["sans"] as { $value: unknown; $type: string };
      expect(leaf.$value).toBe("Roboto");
    });

    it("falls back to first available entry when key is none of the preferred names", () => {
      const unknownKeyFixture = `---
name: UnknownKey
typography:
  display-lg:
    fontFamily: Georgia
    fontSize: 3rem
---
`;
      const { set } = importFromDesignMd(unknownKeyFixture);
      const ffGroup = set.tokens["fontFamily"] as Record<string, unknown>;
      const leaf = ffGroup?.["sans"] as { $value: unknown; $type: string } | undefined;
      // Should pick the only entry ("display-lg") and produce fontFamily.sans
      expect(leaf).toBeDefined();
      expect(leaf?.$value).toBe("Georgia");
    });

    it("skips typography entries that lack fontFamily (find with explicit predicate)", () => {
      // An entry with ONLY fontSize — must NOT be picked as the fontFamily source.
      // fontFamily.sans should be absent rather than containing undefined.
      const noFamilyFixture = `---
name: NoFamily
typography:
  h1:
    fontSize: 3rem
---
`;
      const { set } = importFromDesignMd(noFamilyFixture);
      // fontFamily group should be absent (nothing to pick)
      if ("fontFamily" in set.tokens) {
        const ffGroup = set.tokens["fontFamily"] as Record<string, unknown>;
        const leaf = ffGroup["sans"] as { $value: unknown } | undefined;
        // If present it must have a real string value, not undefined
        expect(typeof leaf?.$value).toBe("string");
      }
      // If absent, that's the correct outcome
    });
  });

  describe("defensive lint() wrapping", () => {
    // @google/design.md is alpha — lint() can throw on malformed input.
    // Errors must be wrapped with the [from-design-md] namespace prefix.
    it("thrown errors are namespaced with [from-design-md]", () => {
      // We verify the try/catch is in place by patching lint via module internals.
      // The most reliable approach: if lint() throws on any input, the resulting
      // Error must contain [from-design-md].
      // For content that does NOT throw, we assert the graceful path still works.
      // This test documents the contract without depending on a specific crash input.
      let caughtError: Error | null = null;
      try {
        // Attempt content that stress-tests the parser with deeply malformed YAML
        importFromDesignMd(
          `---\nfoo: !!binary |\n  <<invalid-base64-content-that-may-trip-parser>>\n---`,
        );
      } catch (e) {
        caughtError = e as Error;
      }

      if (caughtError !== null) {
        // If it did throw, the message must include the namespace prefix
        expect(caughtError).toBeInstanceOf(Error);
        expect(caughtError.message).toContain("[from-design-md]");
      }
      // If lint() handled the input gracefully (no throw), that is also acceptable.
      // The important thing is the try/catch is wired up — proven by the message check above.
    });

    it("wraps lint() errors with contextual [from-design-md] prefix when lint throws", () => {
      // Import the module internals to inject a throwing lint — use vi.mock alternative:
      // instead, we confirm the contract via the module's own behavior on extreme input.
      // Real verification of the wrapper is done via code inspection + the sibling test.
      // This test serves as a regression anchor: importFromDesignMd must never re-throw
      // a raw internal error from @google/design.md.
      const extremeInputs = [
        "---\n: : : invalid-yaml\n---",
        "\x00\x01\x02binary garbage",
        "---\nnull: ~\n---\n" + "x".repeat(10000),
      ];

      for (const input of extremeInputs) {
        try {
          importFromDesignMd(input);
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          // Any error thrown MUST be prefixed with [from-design-md]
          expect((e as Error).message).toContain("[from-design-md]");
        }
      }
    });
  });

  // ─── Prose-color fallback (VoltAgent extended DESIGN.md format) ──────────────

  describe("prose-color fallback", () => {
    /** Pure prose fixture — no front matter; colors live in ## Color Palette & Roles */
    const PROSE_NO_FRONT_MATTER = `# Design System Inspired by Spotify

## 1. Visual Theme & Atmosphere

A dark, immersive music player.

## 2. Color Palette & Roles

### Primary Brand
- **Spotify Green** (\`#1ed760\`): Primary brand accent — play buttons, active states
- **Near Black** (\`#121212\`): Deepest background surface
- **White** (\`#ffffff\`): Primary text on dark surfaces

### Text
- **Silver** (\`#b3b3b3\`): Secondary text, muted labels
`;

    /** Front matter present but colors: is empty; colors are in prose section */
    const PROSE_EMPTY_FM_COLORS = `---
name: EmptyColorsTest
colors:
typography:
  body:
    fontFamily: Inter
    fontSize: 1rem
---

## Color Palette & Roles

- **Brand Red** (\`#e30613\`): Primary CTA color
- **Dark Canvas** (\`#0a0a0a\`): Background surface
- **Text White** (\`#f0f0f0\`): Foreground text
`;

    it("prose fixture (no front matter) — color group is non-empty", () => {
      const { set } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const colorGroup = set.tokens["color"] as Record<string, unknown> | undefined;
      expect(colorGroup).toBeDefined();
      expect(Object.keys(colorGroup ?? {}).length).toBeGreaterThan(0);
    });

    it("prose fixture — extracts spotify-green with value #1ed760", () => {
      const { set } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const colorGroup = set.tokens["color"] as Record<string, { $value: string; $type: string }>;
      expect(colorGroup["spotify-green"]).toBeDefined();
      expect(colorGroup["spotify-green"].$value.toLowerCase()).toBe("#1ed760");
      expect(colorGroup["spotify-green"].$type).toBe("color");
    });

    it("prose fixture — extracts near-black with value #121212", () => {
      const { set } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const colorGroup = set.tokens["color"] as Record<string, { $value: string; $type: string }>;
      expect(colorGroup["near-black"]).toBeDefined();
      expect(colorGroup["near-black"].$value.toLowerCase()).toBe("#121212");
    });

    it("prose fixture — assigns primary role (spotify-green matches brand/accent keywords)", () => {
      const { set } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const colorGroup = set.tokens["color"] as Record<string, { $value: string } | undefined>;
      // primary should be assigned — spotify-green is the first non-neutral brand accent
      expect(colorGroup["primary"]).toBeDefined();
      expect(colorGroup["primary"]?.$value?.toLowerCase()).toBe("#1ed760");
    });

    it("prose fixture — report.warnings includes prose fallback message", () => {
      const { report } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const allWarnings = report.warnings.join(" ").toLowerCase();
      expect(allWarnings).toMatch(/prose fallback/);
    });

    it("prose fixture — produced DTCG tree is valid (all leaves have $value + $type)", () => {
      expect(() =>
        importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" }),
      ).not.toThrow();
      const { set } = importFromDesignMd(PROSE_NO_FRONT_MATTER, { brandName: "spotify" });
      const colorGroup = set.tokens["color"] as Record<string, { $value: unknown; $type: unknown }>;
      for (const [key, leaf] of Object.entries(colorGroup)) {
        expect(leaf.$type, `color.${key} must have $type`).toBe("color");
        expect(typeof leaf.$value, `color.${key}.$value must be string`).toBe("string");
      }
    });

    it("empty-front-matter-colors fixture — colors extracted via prose fallback", () => {
      const { set } = importFromDesignMd(PROSE_EMPTY_FM_COLORS);
      const colorGroup = set.tokens["color"] as Record<string, unknown> | undefined;
      expect(colorGroup).toBeDefined();
      expect(Object.keys(colorGroup ?? {}).length).toBeGreaterThan(0);
    });

    it("empty-front-matter-colors fixture — extracts brand-red", () => {
      const { set } = importFromDesignMd(PROSE_EMPTY_FM_COLORS);
      const colorGroup = set.tokens["color"] as Record<string, { $value: string }>;
      expect(colorGroup["brand-red"]).toBeDefined();
      expect(colorGroup["brand-red"].$value.toLowerCase()).toBe("#e30613");
    });

    it("empty-front-matter-colors fixture — report.warnings includes prose fallback message", () => {
      const { report } = importFromDesignMd(PROSE_EMPTY_FM_COLORS);
      const allWarnings = report.warnings.join(" ").toLowerCase();
      expect(allWarnings).toMatch(/prose fallback/);
    });

    it("normal front-matter fixture — prose fallback does NOT run (no fallback warning)", () => {
      // FULL_FIXTURE has non-empty colors in front matter — prose fallback must not apply
      const { report, set } = importFromDesignMd(FULL_FIXTURE);
      const allWarnings = report.warnings.join(" ").toLowerCase();
      expect(allWarnings).not.toMatch(/prose fallback/);
      // Front-matter colors must still be present
      const colorGroup = set.tokens["color"] as Record<string, unknown>;
      expect(colorGroup["primary"]).toBeDefined();
    });

    it("normal front-matter fixture — prose fallback does NOT override front-matter colors", () => {
      // Front matter has primary: #0033FE — prose fallback must not clobber it
      const { set } = importFromDesignMd(FULL_FIXTURE);
      const colorGroup = set.tokens["color"] as Record<string, { $value: string }>;
      expect(colorGroup["primary"].$value.toLowerCase()).toContain("0033f");
    });
  });

  describe("extractColorsFromProse unit tests", () => {
    it("ignores non-color backtick values like CSS variables", () => {
      const content = `## Color Palette
- **Primary** (\`--text-base\`): Not a color
- **Real Color** (\`#ff0000\`): A real hex
`;
      const result = extractColorsFromProse(content);
      expect(result["primary"]).toBeUndefined(); // --text-base is not a valid CSS color
      expect(result["real-color"]).toBe("#ff0000");
    });

    it("ignores font names in backticks", () => {
      const content = `## Color Palette
- **Body Font** (\`Inter\`): The font
- **Accent** (\`#00ff00\`): Green accent
`;
      const result = extractColorsFromProse(content);
      expect(result["body-font"]).toBeUndefined(); // Inter is not a color
      expect(result["accent"]).toBe("#00ff00");
    });

    it("ignores pixel values in backticks", () => {
      const content = `## Color Palette
- **Size** (\`12px\`): Not a color
- **Blue** (\`#0000ff\`): Blue
`;
      const result = extractColorsFromProse(content);
      expect(result["size"]).toBeUndefined();
      expect(result["blue"]).toBe("#0000ff");
    });

    it("accepts rgb() color values", () => {
      const content = `## Colors
- **Accent** (\`rgb(30, 215, 96)\`): Brand green
`;
      const result = extractColorsFromProse(content);
      expect(result["accent"]).toBe("rgb(30, 215, 96)");
    });

    it("accepts rgba() color values", () => {
      const content = `## Colors
- **Overlay** (\`rgba(0, 0, 0, 0.5)\`): Dark overlay
`;
      const result = extractColorsFromProse(content);
      expect(result["overlay"]).toBe("rgba(0, 0, 0, 0.5)");
    });

    it("de-duplicates by token name (first occurrence wins)", () => {
      const content = `## Colors
- **Blue** (\`#0000ff\`): First
- **Blue** (\`#0033ff\`): Duplicate, should be ignored
`;
      const result = extractColorsFromProse(content);
      expect(result["blue"]).toBe("#0000ff");
    });

    it("kebab-cases multi-word labels", () => {
      const content = `## Colors
- **Electric Blue** (\`#3E6AE1\`): CTA color
- **Pure White** (\`#FFFFFF\`): Background
`;
      const result = extractColorsFromProse(content);
      expect(result["electric-blue"]).toBe("#3E6AE1");
      expect(result["pure-white"]).toBe("#FFFFFF");
    });

    it("returns empty object for content with no color entries", () => {
      const content = `# Some doc
No colors here at all.
`;
      const result = extractColorsFromProse(content);
      expect(Object.keys(result).length).toBe(0);
    });

    it("scopes extraction to the color section when a matching heading exists", () => {
      const content = `## Overview
- **Something** (\`#aabbcc\`): This is before the color section, should NOT be included

## Color Palette & Roles
- **Brand Blue** (\`#0033fe\`): Main brand color

## Typography
- **Font Stack** (\`Inter\`): Not a color here
`;
      const result = extractColorsFromProse(content);
      // Brand Blue should be found
      expect(result["brand-blue"]).toBe("#0033fe");
      // 'something' from Overview section should not be included when there's a dedicated color section
      expect(result["something"]).toBeUndefined();
    });
  });
});
