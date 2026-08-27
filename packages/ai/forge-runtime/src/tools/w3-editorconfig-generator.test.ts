import { describe, expect, it } from "vitest";
import {
  EDITORCONFIG_FILENAME,
  editorconfigGeneratorTool,
  editorconfigGeneratorTools,
  expandGlob,
  globsOverlap,
  parseEditorconfig,
} from "./w3-editorconfig-generator";

interface Result {
  editorconfig: string;
  filename: string;
  root: boolean;
  sections: { glob: string; properties: Record<string, string> }[];
  propertyCount: number;
  warnings: { code: string; level: string; message: string; glob?: string; property?: string }[];
}

function run(input: unknown): Result {
  const parsed = editorconfigGeneratorTool.inputSchema.parse(input);
  return editorconfigGeneratorTool.execute(parsed) as Result;
}

function codes(result: Result): string[] {
  return result.warnings.map((w) => w.code);
}

const BASE = {
  root: true,
  sections: [
    {
      glob: "*",
      properties: {
        charset: "utf-8",
        indent_style: "space",
        indent_size: 2,
        end_of_line: "lf",
        insert_final_newline: true,
        trim_trailing_whitespace: true,
      },
    },
  ],
};

describe("definition", () => {
  it("declares a pure, deterministic contract", () => {
    expect(editorconfigGeneratorTool.id).toBe("dev/editorconfig-generator");
    expect(editorconfigGeneratorTool.sideEffect).toBe("pure");
    expect(editorconfigGeneratorTool.meterId).toBe("forge.dev.editorconfig_generator");
    expect(editorconfigGeneratorTool.roots).toEqual(["generator", "template"]);
    expect(editorconfigGeneratorTool.engine.name).toContain("EditorConfig");
    expect(editorconfigGeneratorTools).toContain(editorconfigGeneratorTool);
  });

  it("is deterministic — same input, byte-identical output", () => {
    expect(run(BASE).editorconfig).toBe(run(BASE).editorconfig);
  });
});

describe("generation", () => {
  it("emits root first, then the section, in spec property order", () => {
    // Spec: `root` is a preamble property and must precede any [section];
    // emission order follows the order the spec documents the properties in.
    expect(run(BASE).editorconfig).toBe(
      [
        "root = true",
        "",
        "[*]",
        "indent_style = space",
        "indent_size = 2",
        "end_of_line = lf",
        "charset = utf-8",
        "trim_trailing_whitespace = true",
        "insert_final_newline = true",
        "",
      ].join("\n"),
    );
  });

  it("ends with a newline so the file satisfies its own insert_final_newline", () => {
    expect(run(BASE).editorconfig.endsWith("\n")).toBe(true);
  });

  it("names the artifact literally .editorconfig (know-how #6)", () => {
    expect(run(BASE).filename).toBe(".editorconfig");
    expect(EDITORCONFIG_FILENAME).toBe(".editorconfig");
  });

  it("separates multiple sections with one blank line and keeps declaration order", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*", properties: { indent_size: 2 } },
        { glob: "*.py", properties: { indent_size: 4 } },
      ],
    });
    expect(out.editorconfig).toBe(
      "root = true\n\n[*]\nindent_size = 2\n\n[*.py]\nindent_size = 4\n",
    );
    expect(out.propertyCount).toBe(2);
  });

  it("omits root = false entirely and says why", () => {
    // `root` defaults to false in the spec; writing `root = false` is noise,
    // but the consequence (parents keep being merged) is worth stating.
    const out = run({ root: false, sections: [{ glob: "*", properties: { indent_size: 2 } }] });
    expect(out.editorconfig).toBe("[*]\nindent_size = 2\n");
    expect(codes(out)).toContain("not_root");
  });

  it("lowercases property names and known values (know-how #8)", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*", properties: { INDENT_STYLE: "TAB", End_Of_Line: "CRLF" } }],
    });
    expect(out.sections[0]?.properties).toEqual({ indent_style: "tab", end_of_line: "crlf" });
    expect(out.editorconfig).toContain("indent_style = tab");
    expect(out.editorconfig).toContain("end_of_line = crlf");
  });

  it("accepts booleans, numbers and numeric strings alike", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*", properties: { insert_final_newline: false, indent_size: "4" } }],
    });
    expect(out.editorconfig).toContain("insert_final_newline = false");
    expect(out.editorconfig).toContain("indent_size = 4");
  });

  it("drops an empty section rather than emitting a header that does nothing", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*", properties: { indent_size: 2 } },
        { glob: "*.md", properties: {} },
      ],
    });
    expect(out.editorconfig).not.toContain("[*.md]");
    expect(codes(out)).toContain("empty_section");
  });

  it("passes unknown properties through but flags them", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*.cs", properties: { dotnet_sort_system_directives_first: "true" } }],
    });
    expect(out.editorconfig).toContain("dotnet_sort_system_directives_first = true");
    expect(codes(out)).toContain("unknown_property");
  });

  it("sorts unknown properties after the core ones, alphabetically", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*", properties: { zzz_custom: "1", aaa_custom: "1", indent_style: "space" } },
      ],
    });
    expect(out.editorconfig).toBe(
      "root = true\n\n[*]\nindent_style = space\naaa_custom = 1\nzzz_custom = 1\n",
    );
  });
});

describe("spec escape hatches (know-how #3 and #7)", () => {
  it("accepts indent_size = tab when indent_style = tab", () => {
    const out = run({
      root: true,
      sections: [{ glob: "Makefile", properties: { indent_style: "tab", indent_size: "tab" } }],
    });
    expect(out.editorconfig).toContain("indent_size = tab");
    expect(codes(out)).not.toContain("indent_size_tab_without_tab_style");
  });

  it("warns when indent_size = tab is set without indent_style = tab", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*", properties: { indent_style: "space", indent_size: "tab" } }],
    });
    expect(codes(out)).toContain("indent_size_tab_without_tab_style");
  });

  it("notes that tab_width falls back to indent_size", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*.go", properties: { indent_style: "tab", indent_size: 4 } }],
    });
    const note = out.warnings.find((w) => w.code === "tab_width_defaults_to_indent_size");
    expect(note?.message).toContain("4");
  });

  it("keeps tab_width and indent_size as independent knobs", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*.go", properties: { indent_style: "tab", indent_size: 4, tab_width: 8 } },
      ],
    });
    expect(out.editorconfig).toContain("indent_size = 4");
    expect(out.editorconfig).toContain("tab_width = 8");
    expect(codes(out)).not.toContain("tab_width_defaults_to_indent_size");
  });

  it("accepts max_line_length = off", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*.md", properties: { max_line_length: "off" } }],
    });
    expect(out.editorconfig).toContain("max_line_length = off");
  });

  it("accepts unset on any property, including booleans and enums", () => {
    const out = run({
      root: true,
      sections: [
        {
          glob: "*.md",
          properties: {
            trim_trailing_whitespace: "unset",
            indent_style: "UNSET",
            max_line_length: "unset",
          },
        },
      ],
    });
    expect(out.editorconfig).toContain("trim_trailing_whitespace = unset");
    expect(out.editorconfig).toContain("indent_style = unset");
    expect(out.editorconfig).toContain("max_line_length = unset");
  });

  it("cautions on charset = utf-8-bom without rejecting it (know-how #4)", () => {
    const out = run({
      root: true,
      sections: [{ glob: "*", properties: { charset: "utf-8-bom" } }],
    });
    expect(out.editorconfig).toContain("charset = utf-8-bom");
    const w = out.warnings.find((x) => x.code === "charset_bom");
    expect(w?.level).toBe("warning");
    expect(w?.message).toContain("shebang");
  });
});

describe("rejections", () => {
  it("rejects an unknown enum value", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { indent_style: "spaces" } }] }),
    ).toThrow(/indent_style must be one of tab, space, unset/);
  });

  it("rejects a non-integer indent_size", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { indent_size: "2.5" } }] }),
    ).toThrow(/indent_size must be a positive integer/);
  });

  it("rejects an out-of-range indent_size", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { indent_size: 0 } }] }),
    ).toThrow(/between 1 and 64/);
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { indent_size: 999 } }] }),
    ).toThrow(/between 1 and 64/);
  });

  it("rejects an unparsable end_of_line", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { end_of_line: "\\n" } }] }),
    ).toThrow(/end_of_line must be one of lf, cr, crlf, unset/);
  });

  it("rejects root as a section property — it belongs to the preamble", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { root: true } }] }),
    ).toThrow(/preamble property/);
  });

  it("rejects a property name that would corrupt the file", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { "indent style": "space" } }] }),
    ).toThrow(/invalid property name/);
  });

  it("rejects a value containing a line break", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*", properties: { custom_key: "a\nb" } }] }),
    ).toThrow(/line break/);
  });

  it("rejects an unbalanced glob rather than emitting a broken header", () => {
    expect(() =>
      run({ root: true, sections: [{ glob: "*.{js,ts", properties: { indent_size: 2 } }] }),
    ).toThrow(/unclosed "\{"/);
    expect(() =>
      run({ root: true, sections: [{ glob: "*.[jt]s", properties: { indent_size: 2 } }] }),
    ).not.toThrow();
    // A stray "]" would close the section header early.
    expect(() =>
      run({ root: true, sections: [{ glob: "*.[jt]s]", properties: { indent_size: 2 } }] }),
    ).toThrow(/unescaped "\]"/);
    expect(() =>
      run({ root: true, sections: [{ glob: "*.[jt", properties: { indent_size: 2 } }] }),
    ).toThrow(/unclosed "\["/);
  });
});

describe("schema rejects bad input", () => {
  it("requires exactly one of sections or source", () => {
    expect(editorconfigGeneratorTool.inputSchema.safeParse({ root: true }).success).toBe(false);
    expect(
      editorconfigGeneratorTool.inputSchema.safeParse({
        root: true,
        sections: [{ glob: "*", properties: {} }],
        source: "[*]\n",
      }).success,
    ).toBe(false);
  });

  it("rejects a non-boolean root and a non-array sections", () => {
    expect(
      editorconfigGeneratorTool.inputSchema.safeParse({ root: "yes", sections: [] }).success,
    ).toBe(false);
    expect(editorconfigGeneratorTool.inputSchema.safeParse({ sections: {} }).success).toBe(false);
  });

  it("rejects an empty section list and an over-long one", () => {
    expect(editorconfigGeneratorTool.inputSchema.safeParse({ sections: [] }).success).toBe(false);
    const many = Array.from({ length: 51 }, () => ({ glob: "*", properties: {} }));
    expect(editorconfigGeneratorTool.inputSchema.safeParse({ sections: many }).success).toBe(false);
  });

  it("rejects a null property value and defaults root to true", () => {
    expect(
      editorconfigGeneratorTool.inputSchema.safeParse({
        sections: [{ glob: "*", properties: { indent_size: null } }],
      }).success,
    ).toBe(false);
    const parsed = editorconfigGeneratorTool.inputSchema.parse({
      sections: [{ glob: "*", properties: { indent_size: 2 } }],
    }) as { root: boolean };
    expect(parsed.root).toBe(true);
  });
});

describe("glob handling (know-how #5)", () => {
  it("repairs an empty glob to * instead of emitting []", () => {
    const out = run({ root: true, sections: [{ glob: "   ", properties: { indent_size: 2 } }] });
    expect(out.editorconfig).toContain("[*]");
    expect(codes(out)).toContain("empty_glob");
  });

  it("flags a regex typed into a glob field", () => {
    const out = run({
      root: true,
      sections: [{ glob: "^src/.*\\.js$", properties: { indent_size: 2 } }],
    });
    expect(codes(out)).toContain("glob_looks_like_regex");
  });

  it("leaves legitimate EditorConfig wildcards alone", () => {
    // The dialect is *, **, ?, [name], [!name], {a,b}, {n1..n2} — no extglob.
    for (const glob of ["*", "**.js", "*.{yml,yaml}", "[Mm]akefile", "[!.]*", "lib/**/*.ts"]) {
      const out = run({ root: true, sections: [{ glob, properties: { indent_size: 2 } }] });
      expect(codes(out)).not.toContain("glob_looks_like_regex");
      expect(out.editorconfig).toContain(`[${glob}]`);
    }
  });

  it("expands alternation and numeric ranges within bounds", () => {
    expect(expandGlob("*.{yml,yaml}")).toEqual(["*.yml", "*.yaml"]);
    expect(expandGlob("v{1..3}.txt")).toEqual(["v1.txt", "v2.txt", "v3.txt"]);
    expect(expandGlob("*.js")).toEqual(["*.js"]);
    // Unbounded expansion is refused rather than guessed at.
    expect(expandGlob("v{1..9999}.txt")).toBeNull();
  });
});

describe("overlap analysis (know-how #2)", () => {
  it("decides the cases it can and stays silent on the rest", () => {
    expect(globsOverlap("*.js", "*.js")).toBe(true);
    expect(globsOverlap("*", "*.md")).toBe(true);
    expect(globsOverlap("*.js", "package.json")).toBe(false);
    expect(globsOverlap("*.json", "package.json")).toBe(true);
    expect(globsOverlap("*.{yml,yaml}", "*.yaml")).toBe(true);
    expect(globsOverlap("*.md", "*.py")).toBe(false);
    expect(globsOverlap("Makefile", "Dockerfile")).toBe(false);
    // Not decidable in this restricted sub-language — no warning, no guess.
    expect(globsOverlap("src/**.js", "**/test/*.js")).toBeNull();
  });

  it("warns that the later of two identical sections wins", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*.js", properties: { indent_size: 2 } },
        { glob: "*.js", properties: { indent_size: 4 } },
      ],
    });
    const w = out.warnings.find((x) => x.code === "duplicate_glob");
    expect(w?.level).toBe("warning");
    expect(w?.message).toContain('resolves to "4"');
  });

  it("explains an override by declaration order, not specificity", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*", properties: { indent_size: 2 } },
        { glob: "*.py", properties: { indent_size: 4 } },
      ],
    });
    const w = out.warnings.find((x) => x.code === "shadowed_property");
    expect(w?.level).toBe("info");
    expect(w?.message).toContain("declaration order");
  });

  it("stays quiet when the overlapping sections agree on the value", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*", properties: { indent_size: 2, charset: "utf-8" } },
        { glob: "*.md", properties: { indent_size: 2, trim_trailing_whitespace: false } },
      ],
    });
    expect(codes(out)).not.toContain("shadowed_property");
  });

  it("stays quiet when the globs are provably disjoint", () => {
    const out = run({
      root: true,
      sections: [
        { glob: "*.py", properties: { indent_size: 4 } },
        { glob: "*.md", properties: { indent_size: 2 } },
      ],
    });
    expect(codes(out)).not.toContain("shadowed_property");
    expect(codes(out)).not.toContain("duplicate_glob");
  });
});

describe("import (paste an existing file)", () => {
  it("round-trips a canonical file byte-for-byte", () => {
    const text = run(BASE).editorconfig;
    expect(run({ source: text }).editorconfig).toBe(text);
  });

  it("drops comments and blank lines, keeps declaration order", () => {
    const out = run({
      source: [
        "# managed by hand",
        "root = true",
        "",
        "[*]",
        "  indent_style = space  ",
        "; trailing comment style",
        "[*.md]",
        "trim_trailing_whitespace = false",
        "",
      ].join("\n"),
    });
    expect(out.editorconfig).toBe(
      "root = true\n\n[*]\nindent_style = space\n\n[*.md]\ntrim_trailing_whitespace = false\n",
    );
  });

  it("normalizes upper-case keys and values on import (know-how #8)", () => {
    const out = run({ source: "[*]\nINDENT_STYLE = SPACE\nINDENT_SIZE = 2\n" });
    expect(out.editorconfig).toBe("[*]\nindent_style = space\nindent_size = 2\n");
    expect(codes(out)).toContain("not_root");
  });

  it("honours the pasted root value over the root field", () => {
    expect(run({ root: true, source: "[*]\nindent_size = 2\n" }).root).toBe(false);
    expect(run({ root: false, source: "root = true\n[*]\nindent_size = 2\n" }).root).toBe(true);
  });

  it("strips a UTF-8 BOM before parsing", () => {
    expect(run({ source: "﻿root = true\n[*]\nindent_size = 2\n" }).root).toBe(true);
  });

  it("still validates imported values", () => {
    expect(() => run({ source: "[*]\nend_of_line = LFF\n" })).toThrow(/end_of_line must be one of/);
  });

  it("rejects an unparsable line with its line number", () => {
    expect(() => run({ source: "[*]\nindent_style\n" })).toThrow(/line 2/);
    expect(() => run({ source: "[*\nindent_style = space\n" })).toThrow(/line 1/);
    expect(() => run({ source: "[*]\nroot = true\n" })).toThrow(/before the first \[section\]/);
  });

  it("drops a stray preamble property with a warning", () => {
    const out = run({ source: "indent_size = 2\n[*]\nindent_style = space\n" });
    expect(codes(out)).toContain("preamble_property_ignored");
    expect(out.editorconfig).not.toContain("indent_size");
  });

  it("parses CRLF sources", () => {
    const parsed = parseEditorconfig("root = true\r\n[*]\r\nindent_size = 2\r\n");
    expect(parsed.root).toBe(true);
    expect(parsed.sections).toEqual([{ glob: "*", properties: { indent_size: "2" } }]);
  });
});
