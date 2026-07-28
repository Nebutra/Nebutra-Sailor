import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  type LanguageDetectOutput,
  languageDetectTool,
} from "./w3-language-detect";

function run(code: string, filenameHint?: string): LanguageDetectOutput {
  return detectLanguage(filenameHint === undefined ? { code } : { code, filenameHint });
}

/* ── definition metadata (ship gates §6.5 #5, #6, #10) ─────────────────── */

describe("languageDetectTool definition", () => {
  it("is a pure, dual-runtime core tool on the detector root", () => {
    expect(languageDetectTool.id).toBe("dev/language-detect");
    expect(languageDetectTool.slug).toBe("language-detect");
    expect(languageDetectTool.sideEffect).toBe("pure");
    expect(languageDetectTool.tier).toBe("core");
    expect(languageDetectTool.meterId).toBe("forge.dev.language_detect");
    expect(languageDetectTool.roots).toContain("detector");
    expect(languageDetectTool.runtime).toEqual(["client", "server"]);
  });

  it("names the spec it implements, not a library it does not depend on", () => {
    expect(languageDetectTool.engine.upstream).toMatch(/linguist/i);
  });

  it("is deterministic — the same input yields a byte-identical result", () => {
    const code = "def main():\n    print('hi')\n";
    expect(JSON.stringify(run(code))).toBe(JSON.stringify(run(code)));
  });
});

/* ── schema (served to agents as JSON Schema over MCP/OpenAPI) ─────────── */

describe("inputSchema", () => {
  const schema = languageDetectTool.inputSchema;

  it("accepts code alone", () => {
    expect(schema.safeParse({ code: "print(1)" }).success).toBe(true);
  });

  it("accepts an optional filenameHint", () => {
    expect(schema.safeParse({ code: "x", filenameHint: "main.h" }).success).toBe(true);
  });

  it("rejects a missing code field", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects empty code — an empty box is not a detection request", () => {
    expect(schema.safeParse({ code: "" }).success).toBe(false);
  });

  it("rejects a non-string code field", () => {
    expect(schema.safeParse({ code: 42 }).success).toBe(false);
  });

  it("rejects code beyond the 500k cap", () => {
    expect(schema.safeParse({ code: "a".repeat(500_001) }).success).toBe(false);
  });

  it("rejects a filenameHint longer than a real path component", () => {
    expect(schema.safeParse({ code: "x", filenameHint: "n".repeat(256) }).success).toBe(false);
  });
});

/* ── core content-only detection ───────────────────────────────────────── */

describe("content-only detection", () => {
  it("identifies Python from def/elif/__main__", () => {
    const out = run(
      [
        "import os",
        "",
        "def greet(name):",
        "    if name:",
        "        return f'hello {name}'",
        "    elif os.getenv('USER'):",
        "        return 'hello you'",
        "    return None",
        "",
        "if __name__ == '__main__':",
        "    print(greet('world'))",
      ].join("\n"),
    );
    expect(out.primary.language).toBe("Python");
    expect(out.primary.confidenceLabel).toBe("high");
    expect(out.isDataFormat).toBe(false);
  });

  it("identifies Go from package/func/:=/fmt", () => {
    const out = run(
      [
        "package main",
        "",
        'import (\n\t"fmt"\n)',
        "",
        "func main() {",
        '\tmsg := "hello"',
        "\tfmt.Println(msg)",
        "}",
      ].join("\n"),
    );
    expect(out.primary.language).toBe("Go");
    expect(out.primary.confidenceLabel).toBe("high");
  });

  it("identifies Rust from let mut / println! / impl", () => {
    const out = run(
      [
        "#[derive(Debug)]",
        "pub struct Counter { n: u32 }",
        "",
        "impl Counter {",
        "    pub fn bump(&mut self) {",
        "        let mut step = 1;",
        "        step += 1;",
        '        println!("{}", step);',
        "    }",
        "}",
      ].join("\n"),
    );
    expect(out.primary.language).toBe("Rust");
    expect(out.primary.confidenceLabel).toBe("high");
  });

  it("identifies Java from the canonical entry point", () => {
    const out = run(
      [
        "package com.example;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        '        System.out.println("hi");',
        "    }",
        "}",
      ].join("\n"),
    );
    expect(out.primary.language).toBe("Java");
    expect(out.primary.confidenceLabel).toBe("high");
  });

  it("separates C++ from C on std:: and iostream", () => {
    const cpp = run('#include <iostream>\nint main() {\n  std::cout << "hi" << std::endl;\n}\n');
    expect(cpp.primary.language).toBe("C++");
    const c = run('#include <stdio.h>\nint main(void) {\n  printf("hi\\n");\n  return 0;\n}\n');
    expect(c.primary.language).toBe("C");
  });

  it("separates TypeScript from JavaScript on type-level syntax", () => {
    const ts = run(
      [
        "export interface User {",
        "  id: string;",
        "  age: number;",
        "}",
        "",
        "export type Result = User | null;",
        "",
        "export function find(id: string): Result {",
        "  return null;",
        "}",
      ].join("\n"),
    );
    expect(ts.primary.language).toBe("TypeScript");

    const js = run(
      [
        'const fs = require("fs");',
        "function read(p) {",
        "  const data = fs.readFileSync(p);",
        "  console.log(data);",
        "  return data;",
        "}",
        "module.exports = read;",
      ].join("\n"),
    );
    expect(js.primary.language).toBe("JavaScript");
  });

  it("identifies SQL case-insensitively", () => {
    const out = run("select id, name\nfrom users\nwhere active = 1\norder by name;");
    expect(out.primary.language).toBe("SQL");
  });

  it("identifies a Dockerfile from its instruction set alone", () => {
    const out = run(
      [
        "FROM node:20-alpine",
        "WORKDIR /app",
        "COPY . .",
        "RUN npm ci",
        'CMD ["node", "index.js"]',
      ].join("\n"),
    );
    expect(out.primary.language).toBe("Dockerfile");
    expect(out.primary.confidenceLabel).toBe("high");
  });

  it("returns Unknown rather than guessing on prose", () => {
    const out = run(
      "The quick brown fox jumps over the lazy dog, and then it goes home to sleep for a while.",
    );
    expect(out.primary.language).toBe("Unknown");
    expect(out.primary.confidenceLabel).toBe("low");
    expect(out.primary.confidenceScore).toBe(0);
    expect(out.warning).toMatch(/no language-specific/i);
  });
});

/* ── know-how §7.1 + §7.2: the filename hint is a hard prior ───────────── */

describe("know-how §7.1 — filenameHint is a hard prior, not decoration", () => {
  it("resolves an unambiguous extension without any content signal", () => {
    const out = run("x = 1", "script.py");
    expect(out.primary.language).toBe("Python");
    expect(out.primary.confidenceLabel).toBe("high");
    expect(out.signals.some((s) => s.includes(".py"))).toBe(true);
  });

  it("accepts a bare extension the user typed by itself", () => {
    expect(run("a := 1", ".go").primary.language).toBe("Go");
    expect(run("a := 1", "go").primary.language).toBe("Go");
  });

  it("resolves extension-less filenames by exact name (Linguist filename stage)", () => {
    expect(run("gem 'rails'", "Gemfile").primary.language).toBe("Ruby");
    expect(run("FROM alpine", "Dockerfile").primary.language).toBe("Dockerfile");
    expect(run("all:\n\techo hi", "Makefile").primary.language).toBe("Makefile");
  });

  it("keeps the prior but reports the disagreement when content says otherwise", () => {
    const out = run('#include <iostream>\nstd::cout << "x";', "notes.py");
    expect(out.primary.language).toBe("Python");
    expect(out.primary.confidenceLabel).toBe("medium");
    expect(out.signals.some((s) => /content leans/.test(s))).toBe(true);
  });

  it("falls back to content when the extension is unknown", () => {
    const out = run("def f():\n    return 1\n", "snippet.qqq");
    expect(out.primary.language).toBe("Python");
    expect(out.signals.some((s) => /not in the extension map/.test(s))).toBe(true);
  });
});

describe("know-how §7.2 — per-extension rule tables for colliding extensions", () => {
  it(".h + @interface → Objective-C, not C", () => {
    const out = run(
      "#import <Foundation/Foundation.h>\n@interface Thing : NSObject\n@end\n",
      "t.h",
    );
    expect(out.primary.language).toBe("Objective-C");
  });

  it(".h + template/std:: → C++", () => {
    const out = run("template <typename T>\nclass Box {\n  std::vector<T> items;\n};\n", "box.h");
    expect(out.primary.language).toBe("C++");
  });

  it(".h with neither marker → C, Linguist's documented default", () => {
    const out = run("int add(int a, int b);\n", "add.h");
    expect(out.primary.language).toBe("C");
    // Fallback is not decisive, so the tier must not claim high confidence.
    expect(out.primary.confidenceLabel).not.toBe("high");
  });

  it(".m disambiguates Objective-C / Mercury / MATLAB / Wolfram", () => {
    expect(run("@implementation Foo\n@end\n", "foo.m").primary.language).toBe("Objective-C");
    expect(run(":- module qsort.\n", "qsort.m").primary.language).toBe("Mercury");
    expect(run("% average of a vector\nfunction [y] = avg(x)\n", "avg.m").primary.language).toBe(
      "MATLAB",
    );
    expect(run("(* a Wolfram comment *)\nf[x_] := x^2\n", "f.m").primary.language).toBe(
      "Wolfram Language",
    );
  });

  it(".pl disambiguates Raku / Perl / Prolog", () => {
    expect(run("use v6;\nsay 'hi';\n", "a.pl").primary.language).toBe("Raku");
    expect(run("use strict;\nmy $x = 1;\n", "a.pl").primary.language).toBe("Perl");
    expect(run("ancestor(X, Y) :- parent(X, Y).\n", "a.pl").primary.language).toBe("Prolog");
  });

  it(".fs disambiguates GLSL / F# / Forth", () => {
    expect(run("#version 330 core\nuniform vec3 color;\n", "s.fs").primary.language).toBe("GLSL");
    expect(run("module Foo\nlet x = 1\n", "s.fs").primary.language).toBe("F#");
    expect(run(": square dup * ;\n", "s.fs").primary.language).toBe("Forth");
  });

  it(".ts is TypeScript by default but XML for a Qt translation file", () => {
    expect(run("const x: number = 1;\n", "a.ts").primary.language).toBe("TypeScript");
    expect(run('<?xml version="1.0"?>\n<TS version="2.1"></TS>\n', "a.ts").primary.language).toBe(
      "XML",
    );
  });

  it(".cs is C# unless Smalltalk markers appear", () => {
    expect(run("using System;\n", "a.cs").primary.language).toBe("C#");
    expect(run("!Object methodsFor: 'printing'!\n", "a.cs").primary.language).toBe("Smalltalk");
  });
});

/* ── Linguist stage 3: shebang ─────────────────────────────────────────── */

describe("shebang stage", () => {
  it("reads the interpreter when there is no filename at all", () => {
    expect(run("#!/usr/bin/env python3\nx = 1\n").primary.language).toBe("Python");
    expect(run("#!/bin/bash\nls\n").primary.language).toBe("Shell");
    expect(run("#!/usr/bin/env node\nvar a = 1\n").primary.language).toBe("JavaScript");
    expect(run("#!/usr/bin/env ruby\nx = 1\n").primary.language).toBe("Ruby");
  });

  it("only reads a shebang on the first line", () => {
    const out = run("x = 1\n#!/usr/bin/env python3\n");
    expect(out.signals.some((s) => s.startsWith("shebang"))).toBe(false);
  });
});

/* ── know-how §7.3: honest low confidence ──────────────────────────────── */

describe("know-how §7.3 — three tiers, honestly assigned", () => {
  it("reports low confidence on a short generic expression", () => {
    const out = run("x = 1");
    expect(out.primary.confidenceLabel).toBe("low");
    expect(out.primary.confidenceScore).toBeLessThanOrEqual(45);
    expect(out.warning).toBeDefined();
  });

  it("reports medium, not high, when a snippet is valid in several related languages", () => {
    // A bare C-family block: legal in C, C++, Java, C# and JS alike.
    const out = run("if (a > b) {\n  a = b;\n}\n");
    expect(out.primary.confidenceLabel).not.toBe("high");
  });

  it("pairs every tier with a numeric score inside that tier's band", () => {
    const samples = [
      "x = 1",
      "if (a > b) { a = b; }",
      "package main\nfunc main() {\n\tx := 1\n\tfmt.Println(x)\n}\n",
    ];
    for (const sample of samples) {
      const out = run(sample);
      const { confidenceLabel: label, confidenceScore: score } = out.primary;
      if (out.primary.language === "Unknown") continue;
      if (label === "high") expect(score).toBeGreaterThanOrEqual(70);
      if (label === "medium") {
        expect(score).toBeGreaterThanOrEqual(46);
        expect(score).toBeLessThanOrEqual(69);
      }
      if (label === "low") expect(score).toBeLessThanOrEqual(45);
      expect(score).toBeLessThanOrEqual(99);
    }
  });

  it("withholds alternates entirely when the primary is high (anti-clutter)", () => {
    const out = run(
      'package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tx := 1\n\tfmt.Println(x)\n}\n',
    );
    expect(out.primary.confidenceLabel).toBe("high");
    expect(out.alternates).toEqual([]);
  });

  it("offers ranked alternates when the answer is not high confidence", () => {
    const out = run("if (a > b) {\n  a = b;\n} else {\n  b = a;\n}\n");
    expect(out.primary.confidenceLabel).not.toBe("high");
    for (const alt of out.alternates) {
      expect(alt.language).not.toBe(out.primary.language);
      expect(alt.confidenceScore).toBeGreaterThan(0);
      expect(alt.confidenceScore).toBeLessThanOrEqual(95);
    }
    expect(out.alternates.length).toBeLessThanOrEqual(3);
  });
});

/* ── know-how §7.4: data formats are named as such ─────────────────────── */

describe("know-how §7.4 — data formats are not folded into a language", () => {
  it("calls a JSON object JSON, not a JavaScript object literal", () => {
    const out = run('{ "name": "forge", "version": 2, "tags": ["a", "b"] }');
    expect(out.primary.language).toBe("JSON");
    expect(out.isDataFormat).toBe(true);
    expect(out.signals.some((s) => /JSON\.parse/.test(s))).toBe(true);
  });

  it("does not call invalid JSON JSON", () => {
    const out = run('{ name: "forge", }');
    expect(out.primary.language).not.toBe("JSON");
  });

  it("flags YAML as a data format", () => {
    const out = run("---\nname: forge\nservices:\n  - web\n  - worker\n");
    expect(out.primary.language).toBe("YAML");
    expect(out.isDataFormat).toBe(true);
  });

  it("flags TOML as a data format", () => {
    const out = run('[package]\nname = "forge"\nversion = "0.1.0"\n\n[[bin]]\nname = "cli"\n');
    expect(out.primary.language).toBe("TOML");
    expect(out.isDataFormat).toBe(true);
  });

  it("recognises uniformly delimited rows as CSV", () => {
    const out = run("id,name,email\n1,ada,ada@example.com\n2,linus,linus@example.com\n");
    expect(out.primary.language).toBe("CSV");
    expect(out.isDataFormat).toBe(true);
  });

  it("does not mark a real programming language as a data format", () => {
    expect(run("def f():\n    return 1\n").isDataFormat).toBe(false);
    expect(run("<!DOCTYPE html>\n<html><body><p>hi</p></body></html>").isDataFormat).toBe(false);
  });
});

/* ── know-how §7.5: multi-language pastes are flagged, not faked ───────── */

describe("know-how §7.5 — multi-language pastes are flagged", () => {
  it("flags a Markdown paste with two fenced blocks", () => {
    const out = run(
      ["# Notes", "", "```js", "const a = 1;", "```", "", "```py", "a = 1", "```", ""].join("\n"),
    );
    expect(out.multiLanguageSuspected).toBe(true);
    expect(out.warning).toMatch(/multiple languages/i);
  });

  it("flags an HTML document carrying both <script> and <style>", () => {
    const out = run(
      [
        "<!DOCTYPE html>",
        "<html><head><style>body { color: red; }</style></head>",
        "<body><script>console.log(1);</script></body></html>",
      ].join("\n"),
    );
    expect(out.multiLanguageSuspected).toBe(true);
    expect(out.primary.language).toBe("HTML");
  });

  it("flags a single-file component (<template> + <script>)", () => {
    const out = run(
      "<template>\n  <div>{{ msg }}</div>\n</template>\n<script setup>\nconst msg = 'hi'\n</script>\n",
    );
    expect(out.multiLanguageSuspected).toBe(true);
  });

  it("does not flag a single-language file", () => {
    const out = run("def f():\n    return 1\n");
    expect(out.multiLanguageSuspected).toBe(false);
  });
});

/* ── know-how §7.7: scope discipline ───────────────────────────────────── */

describe("know-how §7.7 — the tool only answers 'what language'", () => {
  it("returns no quality, style or authorship judgement fields", () => {
    const out = run("def f():\n    return 1\n");
    // `warning` is the one optional key in the §9.6 contract; everything else
    // is fixed, and nothing about quality or authorship may appear.
    const keys = Object.keys(out)
      .filter((k) => k !== "warning")
      .sort();
    expect(keys).toEqual([
      "alternates",
      "engine",
      "isDataFormat",
      "multiLanguageSuspected",
      "primary",
      "signals",
    ]);
    expect(Object.keys(out.primary).sort()).toEqual([
      "confidenceLabel",
      "confidenceScore",
      "language",
    ]);
  });
});

/* ── contract shape + robustness ───────────────────────────────────────── */

describe("output contract", () => {
  it("always populates the fields the brief's §9.6 contract names", () => {
    const out = run("SELECT 1;");
    expect(typeof out.primary.language).toBe("string");
    expect(["high", "medium", "low"]).toContain(out.primary.confidenceLabel);
    expect(Number.isInteger(out.primary.confidenceScore)).toBe(true);
    expect(Array.isArray(out.signals)).toBe(true);
    expect(Array.isArray(out.alternates)).toBe(true);
    expect(typeof out.isDataFormat).toBe("boolean");
    expect(typeof out.multiLanguageSuspected).toBe("boolean");
  });

  it("always names at least one reason for a non-Unknown verdict", () => {
    const out = run("console.log('x');\nconst a = 1;\nmodule.exports = a;\n");
    expect(out.signals.length).toBeGreaterThan(0);
  });

  it("survives whitespace-only and single-character input without throwing", () => {
    expect(() => run("   \n\t ")).not.toThrow();
    expect(() => run("x")).not.toThrow();
    expect(run("   \n\t ").primary.language).toBe("Unknown");
  });

  it("stays bounded on a very large paste", () => {
    const out = run(`${"const a = 1;\n".repeat(40_000)}console.log(a);`);
    expect(out.primary.language).toBe("JavaScript");
  });
});
