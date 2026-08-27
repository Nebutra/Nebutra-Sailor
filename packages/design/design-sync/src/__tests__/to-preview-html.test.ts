/**
 * TDD tests for serializeToPreviewHtml
 *
 * Contract:
 *   - Returns a full <!DOCTYPE html> document (self-contained, no external deps)
 *   - Resolves brand colors from DTCG token sets (no unresolved `{` aliases)
 *   - Contains the design-system name in the output
 *   - Contains a <style> block
 *   - Defines both light (`:root`) and dark (`prefers-color-scheme: dark`) token vars
 *   - Is deterministic (two identical calls produce identical output)
 *   - HTML-escapes the name when it contains `<` or `&` characters
 *   - Renders color swatches, typography samples, and component samples
 *   - Renders a radius scale section
 */

import { describe, expect, it } from "vitest";
import { serializeToPreviewHtml, type ToPreviewHtmlOptions } from "../serialize/to-preview-html";
import { cssAttrValue, escapeHtml } from "../serialize/to-preview-html.template";
import type { DesignTokenSet } from "../types";

// ─── Fixtures (mirrors to-design-md.test.ts) ─────────────────────────────────

const coreSet: DesignTokenSet = {
  name: "core",
  relativePath: "core.json",
  tokens: {
    color: {
      "nebutra-blue": {
        "500": { $value: "#0033fe", $type: "color", $description: "Base brand color — 云毓蓝" },
      },
      "nebutra-cyan": {
        "500": { $value: "#0bf1c3", $type: "color", $description: "Base brand accent — 云毓青" },
      },
      "tertiary-purple": { $value: "#8b5cf6", $type: "color" },
      status: {
        danger: { $value: "#ef4444", $type: "color" },
        warning: { $value: "#f59e0b", $type: "color" },
        success: { $value: "#22c55e", $type: "color" },
      },
    },
    fontFamily: {
      sans: {
        $value: '"Geist", "Noto Sans SC", -apple-system, sans-serif',
        $type: "fontFamily",
      },
      mono: {
        $value: '"Geist Mono", ui-monospace, monospace',
        $type: "fontFamily",
      },
    },
    size: {
      radius: {
        sm: { $value: "0.25rem", $type: "dimension" },
        md: { $value: "0.375rem", $type: "dimension" },
        lg: { $value: "0.5rem", $type: "dimension" },
      },
    },
  },
};

const semanticSet: DesignTokenSet = {
  name: "semantic",
  relativePath: "semantic.json",
  tokens: {
    brand: {
      primary: {
        $value: "{color.nebutra-blue.500}",
        $type: "color",
        $description: "Brand primary — 云毓蓝",
      },
      accent: {
        $value: "{color.nebutra-cyan.500}",
        $type: "color",
        $description: "Brand accent — 云毓青",
      },
      tertiary: { $value: "{color.tertiary-purple}", $type: "color" },
    },
    status: {
      danger: { $value: "{color.status.danger}", $type: "color" },
      warning: { $value: "{color.status.warning}", $type: "color" },
      success: { $value: "{color.status.success}", $type: "color" },
    },
  },
};

const lightThemeSet: DesignTokenSet = {
  name: "themes/light",
  relativePath: "themes/light.json",
  tokens: {
    color: {
      background: { $value: "#ffffff", $type: "color" },
      foreground: { $value: "#0f172a", $type: "color" },
    },
  },
};

const darkThemeSet: DesignTokenSet = {
  name: "themes/dark",
  relativePath: "themes/dark.json",
  tokens: {
    color: {
      background: { $value: "#0a0a0a", $type: "color" },
      foreground: { $value: "#fafafa", $type: "color" },
    },
  },
};

const allSets = [coreSet, semanticSet, lightThemeSet, darkThemeSet];
const coreSets = [coreSet, semanticSet];

// ─── Document structure ───────────────────────────────────────────────────────

describe("serializeToPreviewHtml — document structure", () => {
  it("returns a string starting with <!DOCTYPE html>", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/iu);
  });

  it("returns a full HTML document with <html>, <head>, and <body>", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/<html/iu);
    expect(html).toMatch(/<head/iu);
    expect(html).toMatch(/<body/iu);
    expect(html).toMatch(/<\/body>/iu);
    expect(html).toMatch(/<\/html>/iu);
  });

  it("contains an inline <style> block (no external stylesheets)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/<style[\s>]/iu);
    // Must NOT contain <link rel="stylesheet" href= pointing to external
    expect(html).not.toMatch(/rel\s*=\s*["']stylesheet["']/iu);
  });

  it("does NOT contain any <script> tag (pure CSS, no JS)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).not.toMatch(/<script/iu);
  });
});

// ─── Design-system name ───────────────────────────────────────────────────────

describe("serializeToPreviewHtml — name rendering", () => {
  it("falls back to a generic label, never a brand, when no name is given", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("Design System");
    // This package is provider-agnostic; defaulting to a brand stamped it onto
    // every downstream design system that omitted the option.
    expect(html).not.toContain("Nebutra");
  });

  it("renders the custom name passed in options", () => {
    const html = serializeToPreviewHtml(coreSets, { name: "Acme Design System" });
    expect(html).toContain("Acme Design System");
  });

  it("HTML-escapes < in the name", () => {
    const html = serializeToPreviewHtml(coreSets, { name: "Acme<Corp>" });
    expect(html).not.toContain("<Corp>");
    expect(html).toContain("Acme&lt;Corp&gt;");
  });

  it("HTML-escapes & in the name", () => {
    const html = serializeToPreviewHtml(coreSets, { name: "Foo & Bar" });
    expect(html).not.toContain("Foo & Bar");
    expect(html).toContain("Foo &amp; Bar");
  });

  it("HTML-escapes both < and & together", () => {
    const html = serializeToPreviewHtml(coreSets, { name: "<a>&<b>" });
    expect(html).toContain("&lt;a&gt;&amp;&lt;b&gt;");
  });
});

// ─── Color resolution ─────────────────────────────────────────────────────────

describe("serializeToPreviewHtml — resolved colors", () => {
  it("contains the resolved primary hex (#0033fe) — no unresolved DTCG aliases", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("#0033fe");
    // DTCG alias format is {some.dot.path} — must NOT appear in output.
    // We detect them by looking for { followed by word chars / dots, which
    // is distinct from CSS rule blocks like `:root { --var: val; }`.
    expect(html).not.toMatch(/\{[a-z][a-z0-9._-]*\}/iu);
  });

  it("contains the resolved accent hex (#0bf1c3)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("#0bf1c3");
  });

  it("contains status color hexes (danger, warning, success)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("#ef4444");
    expect(html).toContain("#f59e0b");
    expect(html).toContain("#22c55e");
  });

  it("contains the tertiary hex when resolved", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("#8b5cf6");
  });

  it("includes background/foreground colors when a matching theme set is provided", () => {
    const html = serializeToPreviewHtml(allSets, { theme: "themes/light" });
    expect(html).toContain("#ffffff");
    expect(html).toContain("#0f172a");
  });
});

// ─── Light + dark token definitions ──────────────────────────────────────────

describe("serializeToPreviewHtml — light and dark CSS tokens", () => {
  it("defines CSS custom properties under :root (light mode)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/:root\s*\{/u);
  });

  it("defines CSS custom properties for dark mode via @media (prefers-color-scheme: dark)", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/u);
  });

  it("also defines [data-theme='dark'] selector for explicit dark switching", () => {
    const html = serializeToPreviewHtml(coreSets);
    // Accept either single or double quotes for the attribute selector
    expect(html).toMatch(/\[data-theme\s*=\s*['"]dark['"]\]/u);
  });

  it("dark section defines --color-background different from light when theme provided", () => {
    const html = serializeToPreviewHtml(allSets, { theme: "themes/light" });
    // Light root should have white
    expect(html).toContain("#ffffff");
    // dark section should reference the dark background token from dark theme set
    expect(html).toContain("#0a0a0a");
  });
});

// ─── Content sections ─────────────────────────────────────────────────────────

describe("serializeToPreviewHtml — content sections", () => {
  it("includes a color swatches section", () => {
    const html = serializeToPreviewHtml(coreSets);
    // Should have a section header referencing colors
    expect(html.toLowerCase()).toContain("color");
    // Should have multiple swatch-like elements showing hex values
    expect(html).toContain("#0033fe");
  });

  it("includes a typography section with font family", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html.toLowerCase()).toContain("typography");
    // Should reference the Geist font family
    expect(html).toContain("Geist");
  });

  it("includes an h1 sample element", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/<h1/iu);
  });

  it("includes component samples (button, card, input)", () => {
    const html = serializeToPreviewHtml(coreSets);
    // Expect at least button and input references in the content
    expect(html.toLowerCase()).toContain("button");
    expect(html.toLowerCase()).toContain("input");
  });

  it("includes a radius/shapes section", () => {
    const html = serializeToPreviewHtml(coreSets);
    // sm/md/lg radius values present
    expect(html).toContain("0.25rem");
    expect(html).toContain("0.375rem");
    expect(html).toContain("0.5rem");
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe("serializeToPreviewHtml — determinism", () => {
  it("produces identical output on two calls with the same inputs", () => {
    const options: ToPreviewHtmlOptions = { name: "Acme", theme: "themes/light" };
    const first = serializeToPreviewHtml(allSets, options);
    const second = serializeToPreviewHtml(allSets, options);
    expect(first).toBe(second);
  });

  it("produces identical output for core sets with no options (twice)", () => {
    const first = serializeToPreviewHtml(coreSets);
    const second = serializeToPreviewHtml(coreSets);
    expect(first).toBe(second);
  });

  it("produces different output when different names are passed", () => {
    const a = serializeToPreviewHtml(coreSets, { name: "Alpha" });
    const b = serializeToPreviewHtml(coreSets, { name: "Beta" });
    expect(a).not.toBe(b);
  });
});

// ─── Empty / minimal input ────────────────────────────────────────────────────

describe("serializeToPreviewHtml — empty token sets", () => {
  it("does NOT throw when called with an empty sets array", () => {
    expect(() => serializeToPreviewHtml([])).not.toThrow();
  });

  it("still returns a full <!DOCTYPE html> document with empty sets", () => {
    const html = serializeToPreviewHtml([]);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/iu);
    expect(html).toMatch(/<\/html>/iu);
  });
});

// ─── cssAttrValue helper ──────────────────────────────────────────────────────

describe("cssAttrValue — escaping helper", () => {
  it("HTML-escapes double quotes so they survive inside style='' attributes", () => {
    const result = cssAttrValue('"Geist", "Noto Sans SC", sans-serif');
    // Raw double-quotes must not appear in the output
    expect(result).not.toContain('"');
    // They should be HTML-entity encoded
    expect(result).toContain("&quot;");
    // The font family content is preserved
    expect(result).toContain("Geist");
  });

  it("strips semicolons to prevent CSS declaration injection", () => {
    const result = cssAttrValue("red;display:none");
    // The semicolon that would end the prior property and start a new one must be gone
    expect(result).not.toContain(";");
    // The colon and text are harmless — they are concatenated into the property value
    // (font-family:reddisplay:none is safe; no new declaration can start without a ;)
    // But the original semicolon injection vector is neutralised
    expect(result).toBe("reddisplay:none");
  });

  it("strips curly braces", () => {
    const result = cssAttrValue("value{injected}");
    expect(result).not.toContain("{");
    expect(result).not.toContain("}");
  });

  it("strips < and > to prevent HTML injection", () => {
    const result = cssAttrValue("val<script>alert(1)</script>");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("leaves safe values unchanged (apart from HTML entity encoding)", () => {
    // A plain rem value has no special characters
    expect(cssAttrValue("0.375rem")).toBe("0.375rem");
    expect(cssAttrValue("0.5rem")).toBe("0.5rem");
  });

  it("escapeHtml converts & and < and > and quotes correctly", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    expect(escapeHtml("'apostrophe'")).toBe("&#x27;apostrophe&#x27;");
  });
});

// ─── CRITICAL: font-family escaping in style="" attributes ───────────────────

describe("serializeToPreviewHtml — fontFamily injection safety", () => {
  it("does NOT emit raw unescaped double-quotes inside style= attributes when fontFamily contains quotes", () => {
    // The default coreSet fontFamily is '"Geist", "Noto Sans SC", ...' which
    // contains embedded " that would break style="font-family:..." if not escaped.
    const html = serializeToPreviewHtml(coreSets);
    // Split by style=" occurrences and check each attribute value ends with "
    // rather than being terminated early by an embedded quote.
    // Strategy: assert there is no pattern of style="...<non-quote/=>..." where
    // a raw " appears mid-value (i.e. style="...X"Y... where Y is not space/;/>).
    // Simpler: assert the font-family value appears &quot;-escaped somewhere.
    expect(html).toContain("&quot;Geist&quot;");
  });

  it("does NOT inject display:none as a separate CSS declaration when fontFamily contains a semicolon", () => {
    // Build a set where the font-family token contains a malicious semicolon injection.
    // The attack vector is:  font-family:Foo;display:none  — the ; ends the font-family
    // value and starts a new `display:none` declaration.
    // cssAttrValue() strips the ; so the output becomes font-family:Foodisplay:none
    // (a harmless malformed font name), not a separate display property.
    const maliciousSet: DesignTokenSet = {
      name: "core-evil",
      relativePath: "core-evil.json",
      tokens: {
        fontFamily: {
          sans: {
            $value: "system-ui;display:none",
            $type: "fontFamily",
          },
        },
      },
    };
    const html = serializeToPreviewHtml([maliciousSet]);
    // The semicolon-separated injection pattern must NOT appear:
    // i.e. no `;<whitespace>*display` sequence inside a style attribute value.
    // The semicolon-separated injection pattern must NOT appear inside style="…":
    // i.e. no `;<whitespace>*display` sequence inside a style attribute value.
    expect(html).not.toMatch(/style="[^"]*;\s*display\s*:\s*none/u);
    // Note: the raw token value may appear in .type-meta text content (as a
    // display-only label via escapeHtml — harmless there), so we only assert
    // it is NOT present inside a style= attribute.
    expect(html).not.toMatch(/style="[^"]*system-ui;display:none/u);
  });
});

// ─── Valid CSS: dark-mode rules ───────────────────────────────────────────────

describe("serializeToPreviewHtml — dark-mode CSS validity", () => {
  it("emits a separate :root[data-theme='dark'] rule (not comma-joined with @media)", () => {
    const html = serializeToPreviewHtml(coreSets);
    // The data-theme="dark" selector must appear as its own block
    expect(html).toMatch(/\[data-theme\s*=\s*['"]dark['"]\]\s*\{/u);
  });

  it("emits a valid @media (prefers-color-scheme: dark) rule", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/u);
  });

  it("does NOT contain a comma immediately before @media (invalid CSS)", () => {
    const html = serializeToPreviewHtml(coreSets);
    // A comma followed by optional whitespace then @media is the invalid pattern
    expect(html).not.toMatch(/,\s*@media/u);
  });

  it("does NOT duplicate the @media dark block (only one occurrence)", () => {
    const html = serializeToPreviewHtml(coreSets);
    const matches = html.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gu);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });

  it("uses :root:not([data-theme='light']) inside the @media block so explicit light wins", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toMatch(/:root:not\(\[data-theme\s*=\s*['"]light['"]\]\)/u);
  });
});

// ─── Dark-theme detection ─────────────────────────────────────────────────────

describe("serializeToPreviewHtml — dark theme detection", () => {
  it("picks dark vars from the set named 'themes/dark' by default", () => {
    const html = serializeToPreviewHtml(allSets, { theme: "themes/light" });
    // Dark background from darkThemeSet (#0a0a0a) must appear
    expect(html).toContain("#0a0a0a");
  });

  it("respects an explicit darkTheme option to override the default name", () => {
    const customDarkSet: DesignTokenSet = {
      name: "themes/custom-dark",
      relativePath: "themes/custom-dark.json",
      tokens: {
        color: {
          background: { $value: "#111827", $type: "color" },
          foreground: { $value: "#f9fafb", $type: "color" },
        },
      },
    };
    const html = serializeToPreviewHtml([coreSet, semanticSet, lightThemeSet, customDarkSet], {
      theme: "themes/light",
      darkTheme: "themes/custom-dark",
    });
    // Custom dark background must appear (not the standard #0a0a0a)
    expect(html).toContain("#111827");
  });

  it("falls back to light values when no dark set is found (no throw)", () => {
    // Only provide light theme — no dark set at all
    expect(() =>
      serializeToPreviewHtml([coreSet, semanticSet, lightThemeSet], { theme: "themes/light" }),
    ).not.toThrow();
  });

  it("does NOT mis-detect an unrelated themes/* set as dark", () => {
    // Two theme sets, neither named 'themes/dark'
    const themeA: DesignTokenSet = {
      name: "themes/ocean",
      relativePath: "themes/ocean.json",
      tokens: {
        color: {
          background: { $value: "#0c2340", $type: "color" },
          foreground: { $value: "#e0f0ff", $type: "color" },
        },
      },
    };
    const themeB: DesignTokenSet = {
      name: "themes/sand",
      relativePath: "themes/sand.json",
      tokens: {
        color: {
          background: { $value: "#fdf6e3", $type: "color" },
          foreground: { $value: "#3a2a00", $type: "color" },
        },
      },
    };
    // No set named 'themes/dark' — should NOT pick themeA arbitrarily
    // It should fall back to light (i.e. same as theme index), not throw
    const html = serializeToPreviewHtml([coreSet, semanticSet, themeA, themeB], {
      theme: "themes/ocean",
    });
    // Should not throw and should still produce valid HTML
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/iu);
    // The ocean background used for light should appear (it's both light + dark fallback)
    expect(html).toContain("#0c2340");
    // The sand theme values must NOT appear (not arbitrarily selected)
    expect(html).not.toContain("#fdf6e3");
  });
});
