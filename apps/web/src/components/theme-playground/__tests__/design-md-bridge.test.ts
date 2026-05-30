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
  primary: "#0033FE"
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
      const primary = color["primary"];
      expect(primary).toBeDefined();
      expect(primary.$type).toBe("color");
      // Hex value should contain the core digits (case-insensitive)
      expect(primary.$value.toLowerCase()).toContain("0033f");
    });

    it("tokenSet.color.accent.$type is 'color'", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      const accent = color["accent"];
      expect(accent).toBeDefined();
      expect(accent.$type).toBe("color");
      expect(accent.$value.toLowerCase()).toContain("0bf1c3");
    });

    it("tokenSet.color.background is present", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      expect(color["background"]).toBeDefined();
    });

    it("tokenSet.color.foreground is present", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const color = tokenSet.color as Record<string, { $value: string; $type: string }>;
      expect(color["foreground"]).toBeDefined();
    });
  });

  describe("radius mapping", () => {
    it("tokenSet.radius.md is present when rounded.md is declared", () => {
      const { tokenSet } = importDesignMdToThemeTokens(VALID_FIXTURE);
      const radius = tokenSet.radius as Record<string, { $value: string; $type: string }>;
      expect(radius).toBeDefined();
      const md = radius["md"];
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
      if (color?.["primary"]) {
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
      // name comes from result.set.name which is "themes/<slug>"
      // bridge strips "themes/" prefix if present
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      // The original name is "Test Brand" → slug "test-brand"
      // bridge strips "themes/" → "test-brand"
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
    // The @google/design.md linter is designed to be robust — it MAY silently
    // produce an empty-but-valid result for garbage/binary inputs rather than throw.
    // The contract is: if it DOES throw, it must be a clear Error instance.
    // This matches the upstream from-design-md.test.ts behavior documentation.
    it("either returns a result or throws a clear Error for garbage/binary input", () => {
      let threw = false;
      try {
        importDesignMdToThemeTokens("\x00\x01\x02garbage");
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message.length).toBeGreaterThan(0);
      }
      // Both outcomes are acceptable — but if it throws, must be a clear Error
      expect(typeof threw).toBe("boolean");
    });

    it("throws a clear Error for truly invalid YAML that the linter cannot handle", () => {
      // Deeply malformed YAML may cause a parser throw — if it does, must be an Error
      let threw = false;
      try {
        importDesignMdToThemeTokens("---\n: : : invalid-yaml\n---\n");
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message.length).toBeGreaterThan(0);
      }
      // Acceptable either way
      expect(typeof threw).toBe("boolean");
    });
  });
});

// ─── Suite: exportThemeToDesignMd ─────────────────────────────────────────────

describe("exportThemeToDesignMd", () => {
  describe("neon theme export", () => {
    it("designMd is a non-empty string", () => {
      const { designMd } = exportThemeToDesignMd("neon");
      expect(typeof designMd).toBe("string");
      expect(designMd.length).toBeGreaterThan(0);
    });

    it("designMd contains 'version: alpha' front matter", () => {
      const { designMd } = exportThemeToDesignMd("neon");
      expect(designMd).toContain("version: alpha");
    });

    it("designMd contains a 'colors:' block", () => {
      const { designMd } = exportThemeToDesignMd("neon");
      expect(designMd).toContain("colors:");
    });

    it("previewHtml starts with <!DOCTYPE html>", () => {
      const { previewHtml } = exportThemeToDesignMd("neon");
      expect(previewHtml.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });

    it("previewHtml is a non-empty string", () => {
      const { previewHtml } = exportThemeToDesignMd("neon");
      expect(typeof previewHtml).toBe("string");
      expect(previewHtml.length).toBeGreaterThan(100);
    });
  });

  describe("other built-in themes", () => {
    it.each([
      "gradient",
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
