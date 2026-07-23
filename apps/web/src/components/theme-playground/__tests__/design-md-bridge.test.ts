/**
 * Tests for design-md-bridge.ts — PURE logic layer (no "use server").
 *
 * These tests run under vitest in the apps/web test environment.
 * @nebutra/design-sync is inlined by the vitest server.deps.inline config.
 *
 * NOTE: The bridge module is server-only by convention (imports design-sync which
 * transitively pulls in @google/design.md). These tests do NOT test server actions
 * (actions.ts uses "use server" and is not tested here per vitest compatibility).
 */

import { describe, expect, it } from "vitest";
import { exportThemeToDesignMd, importDesignMdToThemeTokens } from "../design-md-bridge";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Minimal valid DESIGN.md with colors, radius, and a typography entry.
 * Covers: primary, accent, background, foreground (colors) + radius.md + body font.
 */
const VALID_FIXTURE = `---
name: Test Brand
colors:
  primary: "hsl(var(--primary))"
  accent: "#0BF1C3"
  background: "#ffffff"
  foreground: "#111111"
rounded:
  md: "8px"
typography:
  body:
    fontFamily: Inter
    fontSize: 1rem
---

# Typography

## body
- font-family: Inter
- font-size: 1rem
- font-weight: 400
`;

/** Fixture with only a primary color — many required tokens will be absent. */
const SPARSE_FIXTURE = `---
name: Sparse Brand
colors:
  primary: "#ff6600"
---
`;

// ─── Suite: importDesignMdToThemeTokens ───────────────────────────────────────

describe("importDesignMdToThemeTokens", () => {
  describe("color mapping", () => {
    it("tokenSet.color.primary.$value matches the hex supplied in front matter", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      expect(color).toBeDefined();
      const primary = color.primary;
      expect(primary).toBeDefined();
      expect(primary.$type).toBe("color");
      // Hex value should contain the core digits (case-insensitive)
      expect(primary.$value.toLowerCase()).toContain("0033f");
    });

    it("tokenSet.color.accent.$type is 'color'", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      const accent = color.accent;
      expect(accent).toBeDefined();
      expect(accent.$type).toBe("color");
      expect(accent.$value.toLowerCase()).toContain("0bf1c3");
    });

    it("tokenSet.color.background is present", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      expect(color.background).toBeDefined();
    });

    it("tokenSet.color.foreground is present", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      expect(color.foreground).toBeDefined();
    });
  });

  describe("radius mapping", () => {
    it("tokenSet.radius.md is present when rounded.md is declared", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const radius = tokenSet.radius as Record<string, { $value: string; $type: string }>;
      expect(radius).toBeDefined();
      const md = radius.md;
      expect(md).toBeDefined();
      expect(md.$type).toBe("dimension");
      expect(md.$value).toMatch(/\d/);
    });
  });

  describe("report", () => {
    it("report.missingRequired lists tokens absent from the fixture", () => {
      const { report } = importDesignMdToThemeTokens(VALID_FIXTURE);
      // VALID_FIXTURE supplies primary, accent, background, foreground, radius.md, fontFamily.sans
      // but NOT: primary-foreground, card, border, ring
      expect(report.missingRequired).toContain("color.primary-foreground");
      expect(report.missingRequired).toContain("color.card");
      expect(report.missingRequired).toContain("color.border");
      expect(report.missingRequired).toContain("color.ring");
    });

    it("report.missingRequired does NOT list tokens that are present", () => {
      const { tokenSet, report } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, unknown>;
      if (color.primary) {
        expect(report.missingRequired).not.toContain("color.primary");
      }
    });

    it("report.warnings is an array", () => {
      const { report } = importDesignMdToThemeTokens(VALID_FIXTURE);
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it("report.unmapped is an array", () => {
      const { report } = importDesignMdToThemeTokens(VALID_FIXTURE);
      expect(Array.isArray(report.unmapped)).toBe(true);
    });

    it("sparse fixture: report.missingRequired has many entries", () => {
      const { report } = importDesignMdToThemeTokens(SPARSE_FIXTURE);
      expect(report.missingRequired.length).toBeGreaterThan(4);
    });
  });

  describe("name derivation", () => {
    it("name is derived from the DESIGN.md front-matter name (strips themes/ prefix if present, kebab-cases)", () => {
      const { name } = importDesignMdToThemeTokens(VALID_FIXTURE);
      // importFromDesignMd slugifies the front-matter `name` field and stores it as
      // "themes/<slug>" (e.g. "Test Brand" → "themes/test-brand").
      // The bridge strips the "themes/" prefix, so the final name is "test-brand".
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      expect(name).toBe("test-brand");
    });

    it("returns fallback name 'Imported' for fixture with no name", () => {
      const noNameFixture = `---
colors:
  primary: "#000000"
---
`;
      const { name } = importDesignMdToThemeTokens(noNameFixture);
      expect(typeof name).toBe("string");
      // Fallback slug is "imported" from design-sync, bridge strips "themes/" → "imported"
      expect(name.toLowerCase()).toBe("imported");
    });
  });

  describe("error handling", () => {
    // @google/design.md is designed to be robust — it does NOT throw on
    // garbage or binary input. It returns an empty-but-valid ImportedTheme.
    it("returns a valid ImportedTheme (does NOT throw) for garbage/binary input", () => {
      const result = importDesignMdToThemeTokens("\x00\x01\x02garbage");
      // tokenSet must be an object (may have no keys)
      expect(typeof result.tokenSet).toBe("object");
      expect(result.tokenSet).not.toBeNull();
      // report.missingRequired is populated because no required tokens were found
      expect(Array.isArray(result.report.missingRequired)).toBe(true);
      expect(result.report.missingRequired.length).toBeGreaterThan(0);
    });

    it("returns a valid ImportedTheme (does NOT throw) for malformed YAML front-matter", () => {
      // @google/design.md recovers gracefully from invalid YAML; all required
      // tokens end up missing in the report.
      const result = importDesignMdToThemeTokens("---\n: : : invalid-yaml\n---\n");
      expect(typeof result.tokenSet).toBe("object");
      expect(result.tokenSet).not.toBeNull();
      expect(Array.isArray(result.report.missingRequired)).toBe(true);
      expect(result.report.missingRequired.length).toBeGreaterThan(0);
    });
  });
});

// ─── Suite: exportThemeToDesignMd ─────────────────────────────────────────────

describe("exportThemeToDesignMd", () => {
  describe("nebutra theme export", () => {
    it("designMd is a non-empty string", () => {
      const { designMd } = exportThemeToDesignMd("nebutra");
      expect(typeof designMd).toBe("string");
      expect(designMd.length).toBeGreaterThan(0);
    });

    it("designMd contains 'version: alpha' front matter", () => {
      const { designMd } = exportThemeToDesignMd("nebutra");
      expect(designMd).toContain("version: alpha");
    });

    it("designMd contains a 'colors:' block", () => {
      const { designMd } = exportThemeToDesignMd("nebutra");
      expect(designMd).toContain("colors:");
    });

    it("previewHtml starts with <!DOCTYPE html>", () => {
      const { previewHtml } = exportThemeToDesignMd("nebutra");
      expect(previewHtml.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });

    it("previewHtml is a non-empty string", () => {
      const { previewHtml } = exportThemeToDesignMd("nebutra");
      expect(typeof previewHtml).toBe("string");
      expect(previewHtml.length).toBeGreaterThan(100);
    });
  });

  describe("other built-in themes", () => {
    it.each([
      "dark-dense",
      "minimal",
      "vibrant",
      "ocean",
    ] as const)("exportThemeToDesignMd('%s') returns valid designMd and previewHtml", (themeId) => {
      const { designMd, previewHtml } = exportThemeToDesignMd(themeId);
      expect(designMd).toContain("version: alpha");
      expect(previewHtml.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });
  });

  describe("unknown theme error", () => {
    it("throws a clear Error for an unknown themeId", () => {
      expect(() => exportThemeToDesignMd("does-not-exist")).toThrow(Error);
    });

    it("error message mentions the unknown themeId", () => {
      expect(() => exportThemeToDesignMd("does-not-exist")).toThrowError(/does-not-exist/);
    });
  });
});
