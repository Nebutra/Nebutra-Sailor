/**
 * language-detect (root: detector) — brief: docs/plans/tools/language-detect.md
 *
 * Content-only programming-language identification for a snippet that arrives
 * with no filename, per the brief's §7 domain know-how:
 *
 *  1. A bare snippet has strictly less signal than a file. GitHub Linguist's
 *     five-stage strategy (filename → extension → shebang → per-extension
 *     heuristics → statistical fallback) works because the first three stages
 *     usually resolve the answer. A paste skips straight to the weakest stage,
 *     so the optional `filenameHint` is treated as a HARD PRIOR when supplied,
 *     never as decoration.
 *  2. Extension collisions get their own ordered rule tables (Linguist
 *     `heuristics.yml` shape) — `.h`, `.m`, `.pl`, `.fs`, `.ts`, `.cs` — rather
 *     than one generic classifier voting across every language equally.
 *  3. Short/generic input reports LOW confidence honestly. The three tiers use
 *     CodePal's published definitions: high = several language-specific
 *     constructs agree; medium = the snippet is valid in more than one related
 *     language; low = mostly data, pseudocode or generic expression syntax. A
 *     0–100 numeric score ships alongside the tier for agents that threshold
 *     programmatically (no competitor reached offers both).
 *  4. JSON/YAML/TOML/CSV/INI/XML are reported as data formats via
 *     `isDataFormat`, never folded into the nearest real language.
 *  5. Multi-language pastes (fenced blocks, `<script>`+`<style>`, Vue SFC,
 *     notebook cells) are flagged through `multiLanguageSuspected` + a warning
 *     instead of silently picking one block. Per-block breakdown is explicitly
 *     out of scope for v1 (brief §9.4).
 *  7. This tool answers "what language" only — never "is this good code" or
 *     "is this AI-written".
 *
 * Deviation from brief §7.6 / 9.6 (recorded, not hidden): the brief asks for a
 * guesslang- or highlight.js-class statistical classifier rather than a
 * hand-rolled scorer. Neither is a declared dependency of this package and the
 * implementation task forbids adding one, so the content-only stage is a
 * weighted, normalised signal model with anti-signals and margin-based
 * confidence — deliberately reporting `medium`/`low` where a classifier would
 * be needed for a confident call, rather than faking precision.
 *
 * Pure: no network, no fs, no clock, no randomness.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── output contract (brief §9.6) ──────────────────────────────────────── */

export type ConfidenceLabel = "high" | "medium" | "low";

export interface LanguageDetectOutput {
  primary: {
    language: string;
    confidenceLabel: ConfidenceLabel;
    confidenceScore: number;
  };
  isDataFormat: boolean;
  signals: string[];
  alternates: Array<{ language: string; confidenceScore: number }>;
  multiLanguageSuspected: boolean;
  warning?: string;
  engine: string;
}

/** Formats that are data/markup serialisations, not programming languages. */
const DATA_FORMATS = new Set(["JSON", "YAML", "TOML", "CSV", "INI", "XML"]);

const UNKNOWN = "Unknown";

/** Content scoring only ever reads a bounded prefix, so cost stays flat. */
const SCAN_CHARS = 100_000;

/* ── stage 1: exact filenames (Linguist filename strategy) ─────────────── */

const FILENAME_MAP: Readonly<Record<string, string>> = {
  dockerfile: "Dockerfile",
  containerfile: "Dockerfile",
  makefile: "Makefile",
  gnumakefile: "Makefile",
  "cmakelists.txt": "CMake",
  gemfile: "Ruby",
  rakefile: "Ruby",
  podfile: "Ruby",
  vagrantfile: "Ruby",
  guardfile: "Ruby",
  jenkinsfile: "Groovy",
  "cargo.toml": "TOML",
  "go.mod": "Go Module",
  "package.json": "JSON",
  "tsconfig.json": "JSON",
  ".babelrc": "JSON",
  ".bashrc": "Shell",
  ".zshrc": "Shell",
  ".profile": "Shell",
  ".gitignore": "Ignore List",
  ".editorconfig": "INI",
  "requirements.txt": "Pip Requirements",
};

/* ── stage 2: unambiguous extensions ───────────────────────────────────── */

const EXTENSION_MAP: Readonly<Record<string, string>> = {
  py: "Python",
  pyw: "Python",
  pyi: "Python",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JavaScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  java: "Java",
  c: "C",
  cc: "C++",
  cpp: "C++",
  cxx: "C++",
  hpp: "C++",
  hh: "C++",
  cs: "C#",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  mm: "Objective-C",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  psm1: "PowerShell",
  sql: "SQL",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "SCSS",
  md: "Markdown",
  markdown: "Markdown",
  lua: "Lua",
  dart: "Dart",
  scala: "Scala",
  hs: "Haskell",
  ex: "Elixir",
  exs: "Elixir",
  clj: "Clojure",
  cljs: "Clojure",
  sol: "Solidity",
  json: "JSON",
  jsonc: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  csv: "CSV",
  ini: "INI",
  cfg: "INI",
  xml: "XML",
  vue: "Vue",
  groovy: "Groovy",
};

/* ── stage 3: ambiguous extensions (Linguist heuristics.yml shape) ─────── */

interface ExtRule {
  readonly re: RegExp;
  readonly language: string;
  readonly why: string;
}

interface AmbiguousExt {
  readonly rules: readonly ExtRule[];
  /** Applied when no rule fires — Linguist's documented default for the ext. */
  readonly fallback: string;
}

const AMBIGUOUS_EXT: Readonly<Record<string, AmbiguousExt>> = {
  // .h — Objective-C vs C++ vs C (C is the default, per Linguist)
  h: {
    rules: [
      {
        re: /^\s*@(interface|implementation|property|protocol)\b|#import\s+<Foundation/m,
        language: "Objective-C",
        why: "`.h` + Objective-C `@interface`/`#import <Foundation…>` (Linguist `.h` rule)",
      },
      {
        re: /^\s*template\s*<|\bstd::|\bnamespace\s+\w+\s*{|\bclass\s+\w+\s*[:{]/m,
        language: "C++",
        why: "`.h` + C++ `template<`/`std::`/`namespace` (Linguist `.h` rule)",
      },
    ],
    fallback: "C",
  },
  // .m — Objective-C vs Mercury vs MATLAB vs Wolfram
  m: {
    rules: [
      {
        re: /^\s*@(interface|implementation|property)\b|#import\s+</m,
        language: "Objective-C",
        why: "`.m` + Objective-C `@implementation`/`#import` (Linguist `.m` rule)",
      },
      {
        re: /^\s*:-\s*module\b/m,
        language: "Mercury",
        why: "`.m` + Mercury `:- module` (Linguist `.m` rule)",
      },
      {
        re: /^\s*%[^%\n]|^\s*function\s*(\[[^\]]*\]|\w+)\s*=/m,
        language: "MATLAB",
        why: "`.m` + MATLAB `%` comment / `function […] =` (Linguist `.m` rule)",
      },
      {
        re: /\(\*[\s\S]*?\*\)/,
        language: "Wolfram Language",
        why: "`.m` + Wolfram `(* … *)` comment (Linguist `.m` rule)",
      },
    ],
    fallback: "Objective-C",
  },
  // .pl — Prolog vs Perl vs Raku
  pl: {
    rules: [
      {
        re: /^\s*use\s+v6\b/m,
        language: "Raku",
        why: "`.pl` + Raku `use v6` (Linguist `.pl` rule)",
      },
      {
        re: /^\s*(use\s+strict|use\s+warnings|package\s+\w+;)|\bmy\s+\$\w+/m,
        language: "Perl",
        why: "`.pl` + Perl `use strict`/`package`/`my $x` (Linguist `.pl` rule)",
      },
      {
        re: /^\s*[a-z][\w]*(\([^)]*\))?\s*:-/m,
        language: "Prolog",
        why: "`.pl` + Prolog `head :- body` clause (Linguist `.pl` rule)",
      },
    ],
    fallback: "Perl",
  },
  // .fs — Forth vs F# vs GLSL
  fs: {
    rules: [
      {
        re: /^\s*(#version|precision\s+\w+p|uniform\s|varying\s|attribute\s)/m,
        language: "GLSL",
        why: "`.fs` + GLSL `#version`/`uniform` (Linguist `.fs` rule)",
      },
      {
        re: /^\s*(#light|module\s|namespace\s|open\s|let\s|type\s)/m,
        language: "F#",
        why: "`.fs` + F# `module`/`open`/`let` (Linguist `.fs` rule)",
      },
      {
        re: /^:\s/m,
        language: "Forth",
        why: "`.fs` + Forth `: ` word definition (Linguist `.fs` rule)",
      },
    ],
    fallback: "F#",
  },
  // .ts — TypeScript vs XML (Qt Linguist translation file)
  ts: {
    rules: [
      {
        re: /^\s*<\?xml|^\s*<TS\b/m,
        language: "XML",
        why: "`.ts` + `<?xml`/`<TS>` translation file, not TypeScript (Linguist `.ts` rule)",
      },
    ],
    fallback: "TypeScript",
  },
  // .cs — C# vs Smalltalk
  cs: {
    rules: [
      {
        re: /![\w\s]+methodsFor:|^\s*\w+\s+subclass:/m,
        language: "Smalltalk",
        why: "`.cs` + Smalltalk `methodsFor:`/`subclass:` (Linguist `.cs` rule)",
      },
    ],
    fallback: "C#",
  },
  // .r — R vs Rebol
  r: {
    rules: [
      {
        re: /\bREBOL\b/i,
        language: "Rebol",
        why: "`.r` + `REBOL` header (Linguist `.r` rule)",
      },
    ],
    fallback: "R",
  },
};

/* ── stage 4: shebang / document openers ───────────────────────────────── */

const SHEBANG_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [/^#!.*\b(python\d?(\.\d+)?)\b/, "Python"],
  [/^#!.*\b(node|nodejs|bun|deno)\b/, "JavaScript"],
  [/^#!.*\b(bash|sh|zsh|dash|ksh)\b/, "Shell"],
  [/^#!.*\bruby\b/, "Ruby"],
  [/^#!.*\bperl\b/, "Perl"],
  [/^#!.*\bphp\b/, "PHP"],
  [/^#!.*\blua\b/, "Lua"],
  [/^#!.*\bRscript\b/, "R"],
  [/^#!.*\bgroovy\b/, "Groovy"],
  [/^#!.*\btclsh\b/, "Tcl"],
  [/^#!.*\bawk\b/, "Awk"],
  [/^#!.*\bpwsh\b/, "PowerShell"],
];

/* ── stage 5: weighted content signals ─────────────────────────────────── */

interface Signal {
  readonly re: RegExp;
  readonly w: number;
  readonly why: string;
}

interface LanguageModel {
  readonly language: string;
  readonly signals: readonly Signal[];
  /** Patterns that make this language implausible; halve the score when hit. */
  readonly negatives?: readonly RegExp[];
}

const s = (re: RegExp, w: number, why: string): Signal => ({ re, w, why });

const MODELS: readonly LanguageModel[] = [
  {
    language: "Python",
    signals: [
      s(/^\s*def\s+\w+\s*\([^)]*\)\s*(->[^:]+)?:/gm, 3, "`def …():` function definition"),
      s(/^\s*class\s+\w+\s*(\([^)]*\))?\s*:/gm, 3, "`class …:` definition"),
      s(/\b__name__\s*==\s*["']__main__["']/g, 4, '`__name__ == "__main__"` guard'),
      s(/^\s*(from\s+[\w.]+\s+)?import\s+[\w.*,\s]+$/gm, 2, "`import` statement"),
      s(/^\s*elif\b/gm, 3, "`elif` keyword (Python-only spelling)"),
      s(/\bself\./g, 2, "`self.` attribute access"),
      s(/\b(None|True|False)\b/g, 1, "`None`/`True`/`False` literals"),
      s(/^\s*@\w+(\.\w+)*(\(.*\))?\s*$/gm, 1, "decorator line"),
      s(/\bf["'][^"']*\{/g, 2, "f-string interpolation"),
    ],
    negatives: [/;\s*$/m, /\bfunction\s*\(/],
  },
  {
    language: "JavaScript",
    signals: [
      s(/\bconsole\.log\s*\(/g, 3, "`console.log(`"),
      s(/\bmodule\.exports\b/g, 4, "`module.exports`"),
      s(/\brequire\s*\(\s*["']/g, 3, 'CommonJS `require("…")`'),
      s(/\bconst\s+\w+\s*=/g, 2, "`const` binding"),
      s(/\blet\s+\w+\b/g, 2, "`let` binding"),
      s(/=>\s*[{(]/g, 1, "arrow function"),
      s(/===|!==/g, 2, "strict equality `===`"),
      s(/\bdocument\.(getElementById|querySelector)\b/g, 3, "DOM API call"),
      s(/\bexport\s+(default|const|function)\b/g, 2, "ES module `export`"),
      s(/\basync\s+function\b|\bawait\s+\w/g, 1, "`async`/`await`"),
    ],
  },
  {
    language: "TypeScript",
    signals: [
      s(/^\s*(export\s+)?interface\s+\w+\s*(extends[^{]+)?{/gm, 3, "`interface … {` declaration"),
      s(
        /:\s*(string|number|boolean|void|unknown|any|never)\b/g,
        3,
        "explicit primitive type annotation",
      ),
      s(/^\s*(export\s+)?type\s+\w+\s*=/gm, 3, "`type X =` alias"),
      s(/^\s*(export\s+)?enum\s+\w+/gm, 3, "`enum` declaration"),
      s(/\b(readonly|implements)\b/g, 2, "`readonly`/`implements` modifier"),
      s(/\bas\s+(const|\w+)[;,)\s]/g, 1, "`as` type assertion"),
      s(/<\w+(\s*,\s*\w+)*>\s*\(/g, 1, "generic type argument"),
      s(/\bconst\s+\w+\s*[:=]/g, 1, "`const` binding"),
      s(/\bexport\s+(default|const|function|class)\b/g, 1, "ES module `export`"),
    ],
  },
  {
    language: "Java",
    signals: [
      s(/\bpublic\s+static\s+void\s+main\s*\(/g, 4, "`public static void main(`"),
      s(/\bSystem\.out\.print(ln)?\s*\(/g, 4, "`System.out.println(`"),
      s(/^\s*(package|import)\s+[\w.]+\s*;/gm, 2, "`package`/`import …;` header"),
      s(/@Override\b/g, 3, "`@Override` annotation"),
      s(/\bpublic\s+(final\s+)?class\s+\w+/g, 3, "`public class` declaration"),
      s(/\bString\s*\[\]\s*\w+/g, 2, "`String[]` array type"),
      s(/\bnew\s+[A-Z]\w*\s*\(/g, 1, "`new Type(` instantiation"),
    ],
    negatives: [/\bstd::/, /#include\b/],
  },
  {
    language: "C#",
    signals: [
      s(/^\s*using\s+System(\.[\w.]+)?\s*;/gm, 4, "`using System…;`"),
      s(/\bConsole\.Write(Line)?\s*\(/g, 4, "`Console.WriteLine(`"),
      s(/^\s*namespace\s+[\w.]+/gm, 2, "`namespace` declaration"),
      s(/\bpublic\s+(static\s+)?(void|int|string|bool)\b/g, 1, "`public` member signature"),
      s(/\bstring\s*\[\]\s*args\b/g, 3, "`string[] args` entry point"),
      s(/\b(var|async\s+Task)\b/g, 1, "`var`/`async Task`"),
      s(/\bget;\s*set;/g, 3, "auto-property `{ get; set; }`"),
    ],
  },
  {
    language: "C",
    signals: [
      s(/#include\s*<(stdio|stdlib|string|unistd|math)\.h>/g, 4, "`#include <stdio.h>`-family"),
      s(/\bint\s+main\s*\([^)]*\)/g, 3, "`int main(` entry point"),
      s(/\bprintf\s*\(/g, 3, "`printf(`"),
      s(/\b(malloc|calloc|free)\s*\(/g, 2, "manual heap allocation"),
      s(/^\s*(typedef\s+)?struct\s+\w*\s*{/gm, 1, "`struct` definition"),
      s(/\bvoid\s*\*/g, 1, "`void *` pointer"),
    ],
    negatives: [/\bstd::/, /^\s*class\s+\w+\s*[:{]/m],
  },
  {
    language: "C++",
    signals: [
      s(/#include\s*<(iostream|vector|string|map|memory|algorithm)>/g, 4, "C++ STL `#include`"),
      s(/\bstd::/g, 4, "`std::` namespace qualifier"),
      s(/\b(cout|cerr)\s*<</g, 4, "`cout <<` stream output"),
      s(/^\s*template\s*</gm, 3, "`template<` declaration"),
      s(/\bnullptr\b/g, 2, "`nullptr` literal"),
      s(/^\s*(public|private|protected)\s*:/gm, 2, "class access specifier"),
      s(/^\s*namespace\s+\w+/gm, 1, "`namespace` declaration"),
    ],
  },
  {
    language: "Go",
    signals: [
      s(/^\s*package\s+\w+\s*$/gm, 3, "`package …` clause"),
      s(/\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(/g, 3, "`func` declaration"),
      s(/:=/g, 3, "`:=` short variable declaration"),
      s(/\bfmt\.(Print|Sprint)\w*\s*\(/g, 4, "`fmt.Println(`"),
      s(/^\s*import\s*\(/gm, 2, "grouped `import (`"),
      s(/\bdefer\s+\w/g, 2, "`defer` statement"),
      s(/\bchan\s+\w|\bgo\s+func\b/g, 2, "goroutine/channel syntax"),
      s(/\berr\s*!=\s*nil\b/g, 3, "`err != nil` idiom"),
    ],
  },
  {
    language: "Rust",
    signals: [
      s(/\bfn\s+\w+\s*(<[^>]*>)?\s*\(/g, 3, "`fn` declaration"),
      s(/\blet\s+mut\b/g, 4, "`let mut` binding"),
      s(/\b(println|format|vec|panic)!\s*[([]/g, 4, "macro invocation `println!`"),
      s(/^\s*impl(\s*<[^>]*>)?\s+\w+/gm, 3, "`impl` block"),
      s(/->\s*(Result|Option)\s*</g, 3, "`-> Result<…>` return type"),
      s(/#\[\w+/g, 3, "attribute `#[derive(…)]`"),
      s(/\buse\s+[\w:]+::/g, 2, "`use path::to::item`"),
      s(/&(mut\s+)?(str|self)\b/g, 3, "`&str`/`&mut self` borrow"),
    ],
  },
  {
    language: "Ruby",
    signals: [
      s(/^\s*end\s*$/gm, 3, "bare `end` block terminator"),
      s(/\bputs\b/g, 3, "`puts`"),
      s(/\battr_(accessor|reader|writer)\b/g, 4, "`attr_accessor`"),
      s(/\bdo\s*\|[^|]*\|/g, 3, "`do |x|` block"),
      s(/^\s*require(_relative)?\s+["']/gm, 2, '`require "…"`'),
      s(/@\w+\s*=/g, 2, "`@ivar =` assignment"),
      s(/^\s*def\s+\w+[?!]?\s*(\([^)]*\))?\s*$/gm, 2, "`def` without a colon"),
      s(/\bnil\b|\.each\b/g, 2, "`nil` / `.each`"),
    ],
  },
  {
    language: "PHP",
    signals: [
      s(/<\?php\b/g, 5, "`<?php` opening tag"),
      s(/\$\w+\s*=/g, 2, "`$var =` assignment"),
      s(/\becho\s+["'$]/g, 2, "`echo`"),
      s(/\bfunction\s+\w+\s*\(\s*\$/g, 3, "`function f($arg)`"),
      s(/^\s*namespace\s+[\w\\]+\s*;/gm, 2, "`namespace …;`"),
      s(/\buse\s+\w+\\\w+/g, 2, "namespaced `use`"),
      s(/->\w+\s*\(/g, 1, "`->method()` call"),
    ],
  },
  {
    language: "Swift",
    signals: [
      s(/^\s*import\s+(Foundation|UIKit|SwiftUI|Combine)\b/gm, 5, "`import SwiftUI`-family"),
      s(/\bguard\s+[^\n]*\belse\s*{/g, 4, "`guard … else {`"),
      s(/\bfunc\s+\w+\s*\(/g, 2, "`func` declaration"),
      s(/\blet\s+\w+\s*[:=]/g, 2, "`let` binding"),
      s(/\bvar\s+\w+\s*:\s*\w/g, 2, "typed `var` declaration"),
      s(/\?\?|\bif\s+let\b/g, 2, "optional handling `??` / `if let`"),
      s(/@(State|Published|IBOutlet|objc)\b/g, 3, "Swift property wrapper/attribute"),
    ],
  },
  {
    language: "Kotlin",
    signals: [
      s(/\bfun\s+\w+\s*\(/g, 3, "`fun` declaration"),
      s(/\bval\s+\w+\b/g, 3, "`val` binding"),
      s(/\bdata\s+class\b/g, 4, "`data class`"),
      s(/\bcompanion\s+object\b/g, 4, "`companion object`"),
      s(/^\s*import\s+kotlin[\w.]*/gm, 4, "`import kotlin…`"),
      s(/\bprintln\s*\(/g, 2, "`println(`"),
      s(/\?:|\?\./g, 1, "elvis/safe-call operator"),
    ],
  },
  {
    language: "Objective-C",
    signals: [
      s(/@(interface|implementation)\b/g, 5, "`@interface`/`@implementation`"),
      s(/@property\b/g, 4, "`@property`"),
      s(/#import\s+[<"]/g, 4, "`#import`"),
      s(/\bNS(String|Array|Dictionary|Object|Log)\b/g, 4, "`NSString`-family type"),
      s(/\[\s*\w+\s+\w+(:|\])/g, 2, "`[receiver message]` call"),
      s(/\bnonatomic\b|\bstrong\b/g, 3, "property attribute"),
    ],
  },
  {
    language: "Shell",
    signals: [
      s(/^#!.*\b(bash|sh|zsh)\b/m, 5, "shell shebang"),
      s(/^\s*(fi|done|esac)\s*$/gm, 3, "`fi`/`done`/`esac` terminator"),
      s(/\[\[\s.+\s\]\]|\[\s.+\s\]/g, 2, "test expression `[[ … ]]`"),
      s(/\$\{\w+[^}]*\}/g, 2, "braced parameter expansion"),
      s(/^\s*(export|local)\s+\w+=/gm, 2, "`export VAR=` assignment"),
      s(/\|\s*(grep|awk|sed|xargs)\b/g, 3, "pipe into a coreutil"),
      s(/^\s*echo\s+["'$]/gm, 1, "`echo`"),
    ],
  },
  {
    language: "PowerShell",
    signals: [
      s(/\bWrite-(Host|Output|Error)\b/g, 5, "`Write-Host` cmdlet"),
      s(/\b(Get|Set|New|Remove)-[A-Z]\w+/g, 4, "Verb-Noun cmdlet"),
      s(/\[CmdletBinding\(/g, 5, "`[CmdletBinding()]`"),
      s(/-(eq|ne|gt|lt|like|match)\b/g, 2, "PowerShell comparison operator"),
      s(/\$\w+\s*=/g, 1, "`$var =` assignment"),
      s(/\$(PSItem|_)\b/g, 2, "pipeline variable"),
    ],
  },
  {
    language: "SQL",
    signals: [
      s(/\bSELECT\b[\s\S]{0,400}?\bFROM\b/gi, 4, "`SELECT … FROM`"),
      s(/\bCREATE\s+(TABLE|INDEX|VIEW)\b/gi, 5, "`CREATE TABLE`"),
      s(/\bINSERT\s+INTO\b/gi, 4, "`INSERT INTO`"),
      s(/\bUPDATE\b[\s\S]{0,200}?\bSET\b/gi, 3, "`UPDATE … SET`"),
      s(/\b(INNER|LEFT|RIGHT|FULL)?\s*JOIN\b/gi, 2, "`JOIN` clause"),
      s(/\bGROUP\s+BY\b|\bORDER\s+BY\b/gi, 3, "`GROUP BY`/`ORDER BY`"),
      s(/\bWHERE\b/gi, 2, "`WHERE` clause"),
    ],
  },
  {
    language: "HTML",
    signals: [
      s(/<!DOCTYPE\s+html/gi, 5, "`<!DOCTYPE html>`"),
      s(/<html[\s>]/gi, 4, "`<html>` element"),
      s(/<(body|head|section|nav|header|footer)[\s>]/gi, 3, "HTML sectioning element"),
      s(/<(div|span|p|ul|li|table)[\s>]/gi, 2, "common HTML element"),
      s(/<meta\s|<link\s/gi, 2, "`<meta>`/`<link>` head tag"),
      s(/\bclass\s*=\s*["']/g, 1, '`class="…"` attribute'),
    ],
  },
  {
    language: "CSS",
    signals: [
      s(/@media\b/g, 4, "`@media` at-rule"),
      s(/!important\b/g, 3, "`!important`"),
      s(/:(hover|focus|active|nth-child)\b/g, 3, "pseudo-class selector"),
      s(/^\s*[.#]?[\w-]+[^{;\n]*\{\s*$/gm, 2, "selector block opener"),
      s(/^\s*[a-z-]+\s*:\s*[^;{}]+;/gm, 2, "`property: value;` declaration"),
      s(/\b\d+(px|rem|em|vh|vw|%)\s*;/g, 2, "CSS length unit"),
    ],
    negatives: [/\bfunction\b|\bclass\s+\w+\s*[:{]/],
  },
  {
    language: "SCSS",
    signals: [
      s(/@mixin\b/g, 5, "`@mixin`"),
      s(/@include\b/g, 5, "`@include`"),
      s(/@extend\b/g, 4, "`@extend`"),
      s(/^\s*\$[\w-]+\s*:\s*[^;]+;/gm, 3, "`$variable:` declaration"),
      s(/&[.:#&\w-]/g, 3, "`&` parent selector"),
      s(/^\s*[a-z-]+\s*:\s*[^;{}]+;/gm, 1, "`property: value;` declaration"),
    ],
  },
  {
    language: "Markdown",
    signals: [
      s(/^#{1,6}\s+\S/gm, 3, "ATX heading `# …`"),
      s(/^```/gm, 3, "fenced code block"),
      s(/\[[^\]]+\]\([^)]+\)/g, 3, "inline link `[text](url)`"),
      s(/^\s*[-*+]\s+\S/gm, 1, "bullet list item"),
      s(/^>\s+\S/gm, 2, "block quote"),
      s(/\*\*[^*\n]+\*\*/g, 2, "bold `**…**`"),
      s(/^\|.+\|\s*$/gm, 2, "pipe table row"),
    ],
  },
  {
    language: "Lua",
    signals: [
      s(/^\s*local\s+\w+/gm, 4, "`local` declaration"),
      s(/\b(ipairs|pairs)\s*\(/g, 4, "`pairs(`/`ipairs(`"),
      s(/^\s*--\[\[|^\s*--[^-]/gm, 2, "`--` comment"),
      s(/\bthen\s*$/gm, 3, "`then` line terminator"),
      s(/^\s*end\s*$/gm, 2, "bare `end` terminator"),
      s(/\bnil\b|\.\.\s/g, 1, "`nil` / `..` concatenation"),
    ],
  },
  {
    language: "Perl",
    signals: [
      s(/^\s*use\s+(strict|warnings)\s*;/gm, 5, "`use strict;`/`use warnings;`"),
      s(/\bmy\s+[$@%]\w+/g, 4, "`my $var` declaration"),
      s(/\bsub\s+\w+\s*{/g, 3, "`sub name {`"),
      s(/\bqw\s*[([]/g, 4, "`qw(` list quote"),
      s(/=~\s*[ms]?\//g, 3, "`=~ //` binding operator"),
      s(/\$_\b|@ARGV\b/g, 2, "`$_`/`@ARGV` special variable"),
    ],
  },
  {
    language: "R",
    signals: [
      s(/<-\s*\S/g, 4, "`<-` assignment"),
      s(/\blibrary\s*\(\s*\w+\s*\)/g, 5, "`library(pkg)`"),
      s(/\bdata\.frame\s*\(/g, 5, "`data.frame(`"),
      s(/%>%|\|>/g, 3, "pipe operator"),
      s(/\bc\s*\([^)]*\)/g, 2, "`c(…)` vector constructor"),
      s(/\b(TRUE|FALSE|NULL|NA)\b/g, 1, "R logical constants"),
    ],
  },
  {
    language: "MATLAB",
    signals: [
      s(/^\s*function\s*(\[[^\]]*\]|\w+)\s*=\s*\w+/gm, 5, "`function [out] = name(…)`"),
      s(/\.\*|\.\^|\.\//g, 4, "element-wise operator `.*`"),
      s(/\b(zeros|ones|linspace|numel|size)\s*\(/g, 3, "MATLAB builtin call"),
      s(/\b(disp|fprintf)\s*\(/g, 2, "`disp(`/`fprintf(`"),
      s(/^\s*%[^%\n]/gm, 2, "`%` comment"),
      s(/^\s*end\s*$/gm, 1, "bare `end` terminator"),
    ],
  },
  {
    language: "Dart",
    signals: [
      s(/^\s*import\s+'package:/gm, 5, "`import 'package:…'`"),
      s(/\bWidget\s+build\s*\(/g, 5, "`Widget build(`"),
      s(/\b(StatelessWidget|StatefulWidget)\b/g, 5, "Flutter widget base class"),
      s(/\bvoid\s+main\s*\(\s*\)/g, 2, "`void main()`"),
      s(/\bfinal\s+\w+/g, 2, "`final` binding"),
      s(/@override\b/g, 2, "`@override` annotation"),
    ],
  },
  {
    language: "Scala",
    signals: [
      s(/\bcase\s+class\b/g, 5, "`case class`"),
      s(/\bobject\s+\w+(\s+extends\b)?/g, 3, "`object` declaration"),
      s(/\bdef\s+\w+\s*(\[[^\]]*\])?\s*\([^)]*\)\s*:/g, 3, "`def name(…): T`"),
      s(/\bval\s+\w+\b/g, 2, "`val` binding"),
      s(/\btrait\s+\w+/g, 3, "`trait` declaration"),
      s(/\bimplicit\b/g, 3, "`implicit` modifier"),
    ],
  },
  {
    language: "Haskell",
    signals: [
      s(/^\w+\s*::\s*\S/gm, 5, "`name :: Type` signature"),
      s(/^\s*module\s+[\w.]+\s+where/gm, 5, "`module … where`"),
      s(/^\s*import\s+(qualified\s+)?Data\./gm, 4, "`import Data.…`"),
      s(/^\s*data\s+\w+\s*=/gm, 3, "`data T =` declaration"),
      s(/\bwhere\s*$/gm, 2, "`where` clause"),
      s(/->|<-|\$\s/g, 1, "Haskell operator soup `-> <- $`"),
    ],
  },
  {
    language: "Elixir",
    signals: [
      s(/\bdefmodule\s+[\w.]+\s+do\b/g, 5, "`defmodule … do`"),
      s(/\bdef(p)?\s+\w+.*\bdo\b/g, 3, "`def … do`"),
      s(/\|>/g, 4, "`|>` pipe operator"),
      s(/@(moduledoc|doc|spec)\b/g, 5, "`@moduledoc`/`@spec`"),
      s(/^\s*end\s*$/gm, 1, "bare `end` terminator"),
    ],
  },
  {
    language: "Clojure",
    signals: [
      s(/\(defn-?\s+\w/g, 5, "`(defn name …)`"),
      s(/\(ns\s+[\w.]+/g, 5, "`(ns namespace)`"),
      s(/\(let\s*\[/g, 4, "`(let […])` binding"),
      s(/\(println\b|\(str\b/g, 3, "`(println …)`"),
      s(/#\(|#\{/g, 2, "reader macro `#(` / set literal"),
    ],
  },
  {
    language: "Solidity",
    signals: [
      s(/\bpragma\s+solidity\b/g, 5, "`pragma solidity`"),
      s(/\bmsg\.(sender|value)\b/g, 5, "`msg.sender`"),
      s(/\bcontract\s+\w+/g, 4, "`contract` declaration"),
      s(/\buint(8|16|32|64|128|256)?\b/g, 3, "`uint256` type"),
      s(
        /\bfunction\s+\w+\s*\([^)]*\)\s*(public|external|internal|private)/g,
        3,
        "visibility modifier",
      ),
    ],
  },
  {
    language: "Dockerfile",
    signals: [
      s(/^\s*FROM\s+\S+/gm, 5, "`FROM` instruction"),
      s(/^\s*RUN\s+\S/gm, 4, "`RUN` instruction"),
      s(/^\s*(CMD|ENTRYPOINT)\s+\S/gm, 4, "`CMD`/`ENTRYPOINT` instruction"),
      s(/^\s*(COPY|ADD)\s+\S/gm, 3, "`COPY`/`ADD` instruction"),
      s(/^\s*(WORKDIR|EXPOSE|ENV|ARG)\s+\S/gm, 3, "Dockerfile directive"),
    ],
  },
  {
    language: "Makefile",
    signals: [
      s(/^\.PHONY\s*:/gm, 5, "`.PHONY:` target"),
      s(/^\t\S/gm, 4, "tab-indented recipe line"),
      s(/^[\w./%$()-]+\s*:\s*(\S[^=]*)?$/gm, 2, "`target: prereqs` rule"),
      s(/\$\((\w+|@|<)\)/g, 2, "`$(VAR)` expansion"),
      s(/^\w+\s*[:?]?=\s*\S/gm, 1, "make variable assignment"),
    ],
  },
  {
    language: "YAML",
    signals: [
      s(/^---\s*$/gm, 4, "`---` document marker"),
      s(/^\s*-\s+\w[\w -]*:/gm, 3, "list of mappings"),
      s(/^\s{0,8}[\w.-]+:\s*(\S.*)?$/gm, 1, "`key: value` mapping"),
      s(/:\s*[|>]-?\s*$/gm, 3, "block scalar `|`/`>`"),
      s(/^\s*-\s+\S/gm, 1, "`- item` sequence entry"),
    ],
    negatives: [/[{};]\s*$/m, /^\s*(function|class|def|import)\b/m],
  },
  {
    language: "TOML",
    signals: [
      s(/^\s*\[\[[\w.-]+\]\]\s*$/gm, 5, "`[[array.of.tables]]`"),
      s(/^\s*\[[\w.-]+\]\s*$/gm, 3, "`[table]` header"),
      s(/^\s*[\w.-]+\s*=\s*(".*"|\d|\[|true|false)/gm, 2, "`key = value` pair"),
      s(/^\s*#/gm, 1, "`#` comment"),
    ],
  },
  {
    language: "INI",
    signals: [
      s(/^\s*\[[\w. -]+\]\s*$/gm, 2, "`[section]` header"),
      s(/^\s*[\w.-]+\s*=\s*\S/gm, 1, "`key=value` entry"),
      s(/^\s*[;#]\s*\S/gm, 2, "`;` comment"),
    ],
  },
  {
    language: "XML",
    signals: [
      s(/<\?xml\b/g, 5, "`<?xml …?>` declaration"),
      s(/\bxmlns(:\w+)?\s*=/g, 4, "`xmlns` namespace attribute"),
      s(/<\/[\w:.-]+>/g, 1, "closing tag"),
      s(/<[\w:.-]+(\s+[\w:.-]+\s*=\s*"[^"]*")*\s*\/>/g, 2, "self-closing element"),
    ],
    negatives: [/<!DOCTYPE\s+html/i, /<html[\s>]/i],
  },
  {
    language: "Vue",
    signals: [
      s(/<template>/g, 4, "`<template>` block"),
      s(/<script\s+setup\b/g, 5, "`<script setup>` block"),
      s(/\bdefineProps\s*[<(]|\bdefineEmits\s*[<(]/g, 5, "`defineProps`/`defineEmits`"),
      s(/\bv-(if|for|model|bind|on)\b|@click=/g, 4, "Vue template directive"),
    ],
  },
  {
    language: "Groovy",
    signals: [
      s(/\bpipeline\s*{/g, 5, "Jenkins `pipeline {` block"),
      s(/^\s*(stage|steps|agent)\s*[({]/gm, 4, "Jenkins declarative section"),
      s(/\bdef\s+\w+\s*=/g, 2, "`def` binding"),
      s(/\bprintln\b/g, 1, "`println`"),
    ],
  },
];

/* ── scoring ───────────────────────────────────────────────────────────── */

interface Scored {
  language: string;
  raw: number;
  reasons: string[];
  /** Highest single-signal weight that fired — decisiveness, not volume. */
  peak: number;
}

function countMatches(text: string, re: RegExp): number {
  if (re.global) {
    const m = text.match(re);
    return m ? m.length : 0;
  }
  return re.test(text) ? 1 : 0;
}

function scoreModel(text: string, model: LanguageModel): Scored {
  let raw = 0;
  let peak = 0;
  const reasons: string[] = [];
  for (const sig of model.signals) {
    const hits = countMatches(text, sig.re);
    if (hits === 0) continue;
    // Repetition is weak evidence: it saturates after three occurrences so a
    // 500-line file cannot out-shout a decisive one-line marker.
    raw += sig.w * (1 + Math.min(hits - 1, 2) * 0.25);
    peak = Math.max(peak, sig.w);
    reasons.push(sig.why);
  }
  if (model.negatives && raw > 0) {
    for (const neg of model.negatives) {
      if (countMatches(text, neg) > 0) {
        raw *= 0.5;
        break;
      }
    }
  }
  return { language: model.language, raw, reasons, peak };
}

function rank(text: string): Scored[] {
  return MODELS.map((m) => scoreModel(text, m))
    .filter((r) => r.raw > 0)
    .sort((a, b) => (b.raw === a.raw ? a.language.localeCompare(b.language) : b.raw - a.raw));
}

/* ── structural data-format probes (know-how §7.4) ─────────────────────── */

function isStrictJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function looksLikeCsv(text: string): boolean {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return false;
  if (/[{};]\s*$/m.test(text)) return false;
  const first = lines[0] ?? "";
  const commas = (first.match(/,/g) ?? []).length;
  if (commas < 1) return false;
  return lines.every((l) => (l.match(/,/g) ?? []).length === commas);
}

/* ── multi-language detection (know-how §7.5) ──────────────────────────── */

function detectMultiLanguage(text: string): string | null {
  const fences = (text.match(/^```[\w-]*\s*$/gm) ?? []).length;
  if (fences >= 2) return "fenced code blocks";
  const hasScript = /<script[\s>]/i.test(text);
  const hasStyle = /<style[\s>]/i.test(text);
  const hasTemplate = /<template[\s>]/i.test(text);
  if (hasScript && hasStyle) return "`<script>` and `<style>` in one document";
  if (hasTemplate && hasScript) return "single-file-component markers (`<template>` + `<script>`)";
  if (/"cell_type"\s*:\s*"(code|markdown)"/.test(text)) return "notebook cells";
  return null;
}

/* ── filename hint (know-how §7.1, §7.2) ───────────────────────────────── */

interface HintResult {
  language: string | null;
  why: string;
  /** True when the hint alone settles the answer (exact name or clean ext). */
  decisive: boolean;
}

function applyHint(hintRaw: string, text: string): HintResult | null {
  const hint = hintRaw.trim();
  if (!hint) return null;
  const base = (hint.split(/[\\/]/).pop() ?? hint).trim();
  if (!base) return null;
  const lower = base.toLowerCase();

  const byName = FILENAME_MAP[lower];
  if (byName) {
    return {
      language: byName,
      why: `filename \`${base}\` (Linguist filename rule)`,
      decisive: true,
    };
  }

  // People type three things into this box: a full name (`src/main.h`), a bare
  // extension (`.pl` or `pl`), or a name we do not know. All three resolve to
  // an extension token here, or to nothing.
  const dot = lower.lastIndexOf(".");
  let ext = "";
  if (dot > 0) ext = lower.slice(dot + 1);
  else if (lower.startsWith(".") && lower.length > 1) ext = lower.slice(1);
  else if (!lower.includes(".")) ext = lower;
  if (!ext) {
    return {
      language: null,
      why: `filename hint \`${base}\` is not a known name`,
      decisive: false,
    };
  }

  const ambiguous = AMBIGUOUS_EXT[ext];
  if (ambiguous) {
    for (const rule of ambiguous.rules) {
      if (rule.re.test(text)) {
        return { language: rule.language, why: rule.why, decisive: true };
      }
    }
    return {
      language: ambiguous.fallback,
      why: `\`.${ext}\` is ambiguous and no content rule fired — Linguist default \`${ambiguous.fallback}\``,
      decisive: false,
    };
  }

  const byExt = EXTENSION_MAP[ext];
  if (byExt) {
    return {
      language: byExt,
      why: `extension \`.${ext}\` (Linguist extension map)`,
      decisive: true,
    };
  }
  return {
    language: null,
    why: `extension \`.${ext}\` is not in the extension map — falling back to content`,
    decisive: false,
  };
}

/* ── shebang (Linguist stage 3) ────────────────────────────────────────── */

function applyShebang(text: string): { language: string; why: string } | null {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  if (!firstLine.startsWith("#!")) return null;
  for (const [re, language] of SHEBANG_MAP) {
    if (re.test(firstLine)) {
      return { language, why: `shebang \`${firstLine.trim().slice(0, 48)}\`` };
    }
  }
  return null;
}

/* ── confidence (know-how §7.3, CodePal tier definitions) ──────────────── */

function tierBounds(label: ConfidenceLabel): [number, number] {
  if (label === "high") return [70, 99];
  if (label === "medium") return [46, 69];
  return [1, 45];
}

function clampToTier(score: number, label: ConfidenceLabel): number {
  const [lo, hi] = tierBounds(label);
  return Math.max(lo, Math.min(hi, score));
}

/* ── the tool ──────────────────────────────────────────────────────────── */

const inputSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(500_000)
      .describe("The source snippet to identify. No filename is required."),
    filenameHint: z
      .string()
      .max(255)
      .optional()
      .describe(
        "Optional filename or extension (e.g. `main.h`, `.pl`, `Dockerfile`). Used as a hard prior: exact names and unambiguous extensions decide the answer, and collision-prone extensions (.h/.m/.pl/.fs/.ts/.cs/.r) are routed through their own ordered content rules first.",
      ),
  })
  .describe(
    "Identify the programming language of a bare snippet. Returns one primary verdict with a three-tier confidence label plus a 0-100 score, ranked alternates when genuinely ambiguous, and explicit data-format / multi-language flags.",
  );

export function detectLanguage(input: {
  code: string;
  filenameHint?: string;
}): LanguageDetectOutput {
  const code = input.code;
  const scan = code.length > SCAN_CHARS ? code.slice(0, SCAN_CHARS) : code;
  const trimmed = scan.trim();

  const signals: string[] = [];
  const multiReason = detectMultiLanguage(scan);
  const multiLanguageSuspected = multiReason !== null;

  const ranked = rank(scan);
  const contentTop = ranked[0];
  const contentSecond = ranked[1];

  // ── hard priors, in Linguist's order ──────────────────────────────────
  const hint = input.filenameHint ? applyHint(input.filenameHint, scan) : null;
  const shebang = applyShebang(trimmed);
  const jsonStructural = isStrictJson(scan);
  const csvStructural = !jsonStructural && looksLikeCsv(scan);

  let language: string | null = null;
  let decisive = false;

  if (hint) {
    signals.push(hint.why);
    if (hint.language) {
      language = hint.language;
      decisive = hint.decisive;
    }
  }
  if (!language && shebang) {
    language = shebang.language;
    decisive = true;
    signals.push(shebang.why);
  }
  if (!language && jsonStructural) {
    language = "JSON";
    decisive = true;
    signals.push("parses as a strict JSON document (`JSON.parse`)");
  }
  if (!language && csvStructural) {
    language = "CSV";
    decisive = false;
    signals.push("every row carries the same delimiter count — delimited data, not code");
  }

  // ── content stage ─────────────────────────────────────────────────────
  const top = contentTop?.raw ?? 0;
  const second = contentSecond?.raw ?? 0;
  const margin = top > 0 ? Math.max(0, (top - second) / top) : 0;
  const saturation = Math.min(1, top / 12);
  let score = Math.round(100 * (0.55 * saturation + 0.45 * margin));

  const shortInput = trimmed.length < 24 || (!trimmed.includes("\n") && trimmed.length < 40);
  const decisiveContent = (contentTop?.peak ?? 0) >= 4;

  let label: ConfidenceLabel;

  if (language) {
    // A hint/shebang/JSON prior settles the language; the tier reflects how
    // strongly it is settled and whether the content agrees.
    const contentAgrees = contentTop?.language === language;
    if (decisive && (contentAgrees || top === 0)) {
      label = "high";
      score = 96;
    } else if (decisive && top > 0 && !contentAgrees && (contentTop?.peak ?? 0) >= 4) {
      // The prior still wins (brief §7.1) but the disagreement is reported.
      label = "medium";
      score = 60;
      signals.push(
        `content leans \`${contentTop?.language}\` — reported language comes from the stronger filename prior`,
      );
    } else if (decisive) {
      label = "high";
      score = 90;
    } else {
      label = contentAgrees && top >= 6 ? "medium" : "low";
      score = contentAgrees ? 58 : 40;
    }
    if (contentAgrees && contentTop) {
      for (const reason of contentTop.reasons.slice(0, 4)) signals.push(reason);
    }
  } else if (!contentTop || top < 1.5) {
    language = UNKNOWN;
    label = "low";
    score = 0;
    signals.push("no language-specific construct matched");
  } else {
    language = contentTop.language;
    for (const reason of contentTop.reasons.slice(0, 5)) signals.push(reason);
    if (shortInput && !decisiveContent) {
      label = "low";
    } else if (contentTop.reasons.length >= 2 && margin >= 0.34 && top >= 6) {
      label = "high";
    } else if (contentTop.reasons.length < 2 || top < 3) {
      label = "low";
    } else {
      label = "medium";
    }
    score = clampToTier(score, label);
  }

  if (language !== UNKNOWN) score = clampToTier(score, label);

  // ── alternates: withheld entirely when the primary is high (§9.1.3) ────
  const alternates =
    label === "high"
      ? []
      : ranked
          .filter((r) => r.language !== language)
          .slice(0, 3)
          .map((r) => ({
            language: r.language,
            confidenceScore: Math.max(1, Math.min(95, Math.round((r.raw / Math.max(top, 1)) * 90))),
          }));

  // ── one warning, highest priority wins ────────────────────────────────
  let warning: string | undefined;
  if (language === UNKNOWN) {
    warning =
      "No language-specific constructs found — this may be prose, pseudocode or plain data.";
  } else if (shortInput && label !== "high") {
    warning = "Input is short — content-only detection is unreliable below a few lines.";
  } else if (multiLanguageSuspected) {
    warning = `Input appears to contain multiple languages (${multiReason}); the dominant one is reported. Per-block detection is not part of this version.`;
  }

  return {
    primary: { language, confidenceLabel: label, confidenceScore: score },
    isDataFormat: DATA_FORMATS.has(language),
    signals,
    alternates,
    multiLanguageSuspected,
    ...(warning ? { warning } : {}),
    engine: "forge-linguist-heuristics",
  };
}

export const languageDetectTool = tool({
  id: "dev/language-detect",
  slug: "language-detect",
  category: "dev",
  title: { zh: "编程语言识别", en: "Programming Language Detector" },
  description: {
    zh: "识别无文件名代码片段的编程语言：三档置信度 + 0-100 分数、数据格式判定、多语言粘贴提示；可选文件名提示按 Linguist 规则消歧",
    en: "Identify the language of a filename-less code snippet: three-tier confidence plus a 0-100 score, explicit data-format verdict, multi-language paste flag, and Linguist-style disambiguation when a filename hint is supplied",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.language_detect",
  roots: ["detector", "analyzer"],
  engine: {
    name: "forge-linguist-heuristics",
    // Spec implemented, not a library we depend on: Linguist's documented
    // detection strategy and the per-extension rules in its heuristics.yml.
    upstream: "github-linguist detection strategy + heuristics.yml rule shape",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "代码语言识别,判断代码是什么语言,编程语言检测,代码片段语言识别",
    en: "programming language detector, detect code language online, identify programming language from code, what language is this code",
  },
  inputSchema,
  execute: (input: { code: string; filenameHint?: string }) => detectLanguage(input),
});

export const w3LanguageDetectTools: readonly AnyForgeToolDefinition[] = [languageDetectTool];
