import { describe, expect, it } from "vitest";
import { serializeToDesignMd, type ToDesignMdOptions } from "../serialize/to-design-md";
import type { DesignTokenSet } from "../types";

// ─── Minimal synthetic fixtures (deterministic, NOT real files) ────────────────

/** Core fixture: provides the primitives that semantic references resolve to. */
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
        $value: '"Geist", "Noto Sans SC", "PingFang SC", -apple-system, sans-serif',
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
      container: {
        text: { $value: "896px", $type: "dimension" },
        content: { $value: "1152px", $type: "dimension" },
        wide: { $value: "1400px", $type: "dimension" },
      },
    },
  },
};

/** Semantic fixture: brand tokens referencing core via aliases. */
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

/** Light theme fixture for background/foreground. */
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

// ─── Helper: split front-matter from body ──────────────────────────────────────

function splitFrontMatter(md: string): { frontMatter: string; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No YAML front matter delimiters found in output");
  }
  return { frontMatter: match[1], body: match[2] };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("serializeToDesignMd — alias resolution", () => {
  it("resolves a brand.primary alias chain to the bare hex value in front matter", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('primary: "#0033fe"');
  });

  it("resolves brand.accent to the correct cyan hex", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('accent: "#0bf1c3"');
  });

  it("resolves status colors through aliases", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('danger: "#ef4444"');
    expect(frontMatter).toContain('warning: "#f59e0b"');
    expect(frontMatter).toContain('success: "#22c55e"');
  });

  it("resolves indirect alias (brand.tertiary → color.tertiary-purple)", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('tertiary: "#8b5cf6"');
  });
});

describe("serializeToDesignMd — $description propagation", () => {
  it("flows the source token $description (not a hardcoded constant) into the Colors prose", () => {
    // Use a DISTINCT, unique string to prove the value comes from the token itself
    const uniqueDesc = "UNIQUE-DESC-PRIMARY-xyz";
    const setWithUniqueDesc: DesignTokenSet = {
      name: "semantic-unique",
      relativePath: "semantic-unique.json",
      tokens: {
        brand: {
          primary: {
            $value: "#0033fe",
            $type: "color",
            $description: uniqueDesc,
          },
        },
      },
    };
    const md = serializeToDesignMd([setWithUniqueDesc]);
    const { body } = splitFrontMatter(md);
    // The unique description must appear verbatim — it cannot come from any constant
    expect(body).toContain(uniqueDesc);
  });

  it("includes brand.accent description when the source token carries $description", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { body } = splitFrontMatter(md);
    // semanticSet has brand.accent.$description = "Brand accent — 云毓青"
    expect(body).toContain("Brand accent — 云毓青");
  });

  it("renders a Colors bullet without trailing description when source token has no $description", () => {
    // status.* tokens in the fixture carry no $description
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { body } = splitFrontMatter(md);
    // Danger bullet should still render but must NOT end with " — undefined" or anything hardcoded
    expect(body).toMatch(/\*\*Danger\*\* \(`#ef4444`\)(?!\s*—)/);
  });
});

describe("serializeToDesignMd — prose section order", () => {
  const SECTIONS = [
    "## Overview",
    "## Colors",
    "## Typography",
    "## Layout",
    "## Elevation & Depth",
    "## Shapes",
    "## Components",
    "## Do's and Don'ts",
  ] as const;

  it("emits all required sections in the correct order", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { body } = splitFrontMatter(md);

    let lastIdx = -1;
    for (const section of SECTIONS) {
      const idx = body.indexOf(section);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});

describe("serializeToDesignMd — no unresolved token references", () => {
  it("produces output containing no unresolved {…} references", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    // Match any leftover {ref} pattern — aliases or template literals should not appear
    expect(md).not.toMatch(/\{[a-zA-Z][^}]*\}/);
  });
});

describe("serializeToDesignMd — front matter parseability", () => {
  it("wraps front matter in --- delimiters", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    expect(md.startsWith("---\n")).toBe(true);
    // second delimiter
    const secondDelim = md.indexOf("\n---\n", 4);
    expect(secondDelim).toBeGreaterThan(0);
  });

  it("front matter contains version: alpha (exact value), name, and colors keys", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    // Assert the literal line — not just the key prefix
    expect(frontMatter).toMatch(/^version: alpha$/m);
    expect(frontMatter).toMatch(/^name:/m);
    expect(frontMatter).toMatch(/^colors:/m);
  });

  it("front matter contains typography and rounded sections", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toMatch(/^typography:/m);
    expect(frontMatter).toMatch(/^rounded:/m);
  });
});

describe("serializeToDesignMd — theme colors", () => {
  it("includes background and foreground from a named theme set", () => {
    const md = serializeToDesignMd([coreSet, semanticSet, lightThemeSet], {
      theme: "themes/light",
    });
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('background: "#ffffff"');
    expect(frontMatter).toContain('foreground: "#0f172a"');
  });

  it("omits background/foreground when no theme option provided", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).not.toContain("background:");
    expect(frontMatter).not.toContain("foreground:");
  });
});

describe("serializeToDesignMd — error handling", () => {
  it("throws a descriptive error for a dangling (unresolvable) alias", () => {
    const badSet: DesignTokenSet = {
      name: "bad",
      relativePath: "bad.json",
      tokens: {
        brand: {
          primary: {
            $value: "{missing.deep.ref}",
            $type: "color",
          },
        },
      },
    };
    expect(() => serializeToDesignMd([badSet])).toThrow(/missing\.deep\.ref/);
  });

  it("skips a color role gracefully when its source token is absent", () => {
    // No 'semantic' set here — brand.primary won't be found, should not throw
    expect(() => serializeToDesignMd([coreSet])).not.toThrow();
    const md = serializeToDesignMd([coreSet]);
    const { frontMatter } = splitFrontMatter(md);
    // Without the semantic set, primary key should be absent
    expect(frontMatter).not.toContain("primary:");
  });
});

describe("serializeToDesignMd — determinism", () => {
  it("returns identical strings on two consecutive calls with the same input", () => {
    const first = serializeToDesignMd([coreSet, semanticSet]);
    const second = serializeToDesignMd([coreSet, semanticSet]);
    expect(first).toBe(second);
  });
});

describe("serializeToDesignMd — Do's and Don'ts", () => {
  it("includes canonical do/don't rules from design governance", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { body } = splitFrontMatter(md);
    // Do rules
    expect(body).toContain("AnimateIn");
    expect(body).toContain("aria-label");
    expect(body).toContain("brand gradient");
    expect(body).toContain("semantic tokens");
    // Don't rules
    expect(body).toContain("max-w-5xl");
    expect(body).toContain("max-w-7xl");
    expect(body).toContain("hardcode");
    expect(body).toContain("focus rings");
  });
});

describe("serializeToDesignMd — options", () => {
  it("uses the provided name in the front matter", () => {
    const md = serializeToDesignMd([coreSet, semanticSet], { name: "Acme" });
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('name: "Acme"');
  });

  it("uses the provided description in the front matter", () => {
    const md = serializeToDesignMd([coreSet, semanticSet], {
      description: "Test design system",
    });
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('description: "Test design system"');
  });

  it("defaults name to Nebutra when not provided", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('name: "Nebutra"');
  });
});

describe("serializeToDesignMd — layout section", () => {
  it("mentions container widths when size.container tokens are present", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { body } = splitFrontMatter(md);
    const layoutSection = body.slice(body.indexOf("## Layout"));
    // Should mention the three container widths
    expect(layoutSection).toContain("896px");
    expect(layoutSection).toContain("1152px");
    expect(layoutSection).toContain("1400px");
  });
});

describe("serializeToDesignMd — rounded section", () => {
  it("maps size.radius tokens into the rounded front-matter group", () => {
    const md = serializeToDesignMd([coreSet, semanticSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain("sm:");
    expect(frontMatter).toContain("md:");
    expect(frontMatter).toContain("lg:");
  });
});

describe("serializeToDesignMd — cycle detection", () => {
  it("throws a clear error when a color role references a circular alias chain", () => {
    // a = {b}, b = {a} — classic cycle
    const cycleSet: DesignTokenSet = {
      name: "cycle",
      relativePath: "cycle.json",
      tokens: {
        a: { $value: "{b}", $type: "color" },
        b: { $value: "{a}", $type: "color" },
        brand: {
          primary: { $value: "{a}", $type: "color" },
        },
      },
    };
    expect(() => serializeToDesignMd([cycleSet])).toThrow(/[Cc]ycle/);
  });
});

describe("serializeToDesignMd — hex normalization", () => {
  it("expands 3-char hex shorthand to 6-char lowercase in front matter", () => {
    const shortHexSet: DesignTokenSet = {
      name: "short-hex",
      relativePath: "short-hex.json",
      tokens: {
        brand: {
          primary: { $value: "#FFF", $type: "color" },
        },
      },
    };
    const md = serializeToDesignMd([shortHexSet]);
    const { frontMatter } = splitFrontMatter(md);
    // #FFF must be emitted as the expanded 6-digit lowercase form
    expect(frontMatter).toContain('primary: "#ffffff"');
    // The raw 3-char shorthand must not appear in the output
    expect(frontMatter).not.toMatch(/"#[fF]{3}"/);
  });

  it("expands mixed-case 3-char hex to 6-char lowercase (#Abc → #aabbcc)", () => {
    const mixedSet: DesignTokenSet = {
      name: "mixed-hex",
      relativePath: "mixed-hex.json",
      tokens: {
        brand: {
          primary: { $value: "#Abc", $type: "color" },
        },
      },
    };
    const md = serializeToDesignMd([mixedSet]);
    const { frontMatter } = splitFrontMatter(md);
    expect(frontMatter).toContain('primary: "#aabbcc"');
  });
});
