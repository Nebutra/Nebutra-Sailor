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
  it("renders default name 'Nebutra' in the document when no options provided", () => {
    const html = serializeToPreviewHtml(coreSets);
    expect(html).toContain("Nebutra");
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
