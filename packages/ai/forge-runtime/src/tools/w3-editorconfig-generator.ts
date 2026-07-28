/**
 * .editorconfig generator (brief: docs/plans/tools/editorconfig-generator.md).
 *
 * Spec implemented: EditorConfig File Format Specification (editorconfig.org),
 * "Supported Properties" + "Wildcard Patterns" + file-resolution rules. No
 * upstream library — the whole job is emitting/parsing a tiny INI-like format,
 * so the engine is the spec, not a dependency.
 *
 * The four reached competitors (§2 of the brief) all stop at "render the form
 * back as text". The know-how encoded here is what none of them surface:
 *  - later-declared sections win over earlier ones for a shared property
 *    (declaration order, NOT glob specificity) → shadow warnings
 *  - `indent_size = tab` is a legal spec value, `max_line_length = off` too,
 *    and *any* property accepts `unset` to cancel an inherited value
 *  - `charset = utf-8-bom` is legal but breaks shebangs/toolchains → caution
 *  - property and value names are case-insensitive on input, lowercase on
 *    output (matters for the paste-to-import path)
 *  - the artifact's filename is literally `.editorconfig`, extension-only
 */
import { z } from "zod";
import { ForgeRuntimeError } from "../errors";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

function reject(message: string): never {
  throw new ForgeRuntimeError("invalid_input", message);
}

/* ── spec vocabulary ──────────────────────────────────────────────────────── */

/** The literal artifact name. Extension-only on purpose (know-how #6). */
export const EDITORCONFIG_FILENAME = ".editorconfig";

/** `unset` cancels a value inherited from a parent `.editorconfig` (spec). */
const UNSET = "unset";

/** Emission order = the order the spec documents these properties in. */
const KNOWN_PROPERTY_ORDER = [
  "indent_style",
  "indent_size",
  "tab_width",
  "end_of_line",
  "charset",
  "trim_trailing_whitespace",
  "insert_final_newline",
  "max_line_length",
] as const;

type KnownProperty = (typeof KNOWN_PROPERTY_ORDER)[number];

const KNOWN_PROPERTIES = new Set<string>(KNOWN_PROPERTY_ORDER);

const ENUM_VALUES: Partial<Record<KnownProperty, readonly string[]>> = {
  indent_style: ["tab", "space"],
  end_of_line: ["lf", "cr", "crlf"],
  charset: ["latin1", "utf-8", "utf-8-bom", "utf-16be", "utf-16le"],
  trim_trailing_whitespace: ["true", "false"],
  insert_final_newline: ["true", "false"],
};

const MAX_INDENT = 64;
const MAX_LINE_LENGTH = 10_000;

export type WarningLevel = "info" | "warning";

export interface EditorconfigWarning {
  readonly code: string;
  readonly level: WarningLevel;
  readonly message: string;
  readonly glob?: string;
  readonly property?: string;
}

export interface NormalizedSection {
  readonly glob: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface EditorconfigResult {
  readonly editorconfig: string;
  readonly filename: string;
  readonly root: boolean;
  readonly sections: readonly NormalizedSection[];
  readonly propertyCount: number;
  readonly warnings: readonly EditorconfigWarning[];
}

/* ── property normalization ───────────────────────────────────────────────── */

function toRawString(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) reject("property values must be finite numbers");
    return String(value);
  }
  return value;
}

function parsePositiveInt(raw: string, name: string, max: number): string {
  if (!/^\d+$/.test(raw)) {
    reject(`${name} must be a positive integer (got "${raw}")`);
  }
  const n = Number.parseInt(raw, 10);
  if (n < 1 || n > max) reject(`${name} must be between 1 and ${max} (got ${n})`);
  return String(n);
}

/**
 * Normalize one property. Names and values are case-insensitive per spec but
 * conventionally lowercase, so both are lowercased for known properties
 * (know-how #8). Unknown property names pass through — editors ignore what they
 * do not recognise, and .NET/ReSharper keys live there — but are flagged and
 * keep their original value casing, which those extensions care about.
 */
function normalizeProperty(
  rawName: string,
  rawValue: string | number | boolean,
): { name: string; value: string; known: boolean } {
  const name = rawName.trim().toLowerCase();
  if (name === "") reject("property name must not be empty");
  if (name === "root") {
    reject("`root` is a preamble property, not a section property — use the `root` input field");
  }
  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(name)) {
    reject(`invalid property name "${rawName}" (allowed: letters, digits, "_", ".", "-")`);
  }

  const rawText = toRawString(rawValue).trim();
  if (rawText === "") reject(`${name} must not be empty (use "unset" to cancel it)`);
  if (/[\r\n]/.test(rawText)) reject(`${name} must not contain a line break`);

  if (!KNOWN_PROPERTIES.has(name)) {
    return { name, value: rawText, known: false };
  }

  const lower = rawText.toLowerCase();
  if (lower === UNSET) return { name, value: UNSET, known: true };

  const known = name as KnownProperty;
  const allowed = ENUM_VALUES[known];
  if (allowed) {
    if (!allowed.includes(lower)) {
      reject(`${name} must be one of ${[...allowed, UNSET].join(", ")} (got "${rawText}")`);
    }
    return { name, value: lower, known: true };
  }
  if (known === "indent_size") {
    // Spec: `indent_size = tab` means "use tab_width" when indenting with tabs.
    if (lower === "tab") return { name, value: "tab", known: true };
    return { name, value: parsePositiveInt(lower, name, MAX_INDENT), known: true };
  }
  if (known === "tab_width") {
    return { name, value: parsePositiveInt(lower, name, MAX_INDENT), known: true };
  }
  // max_line_length: a number, or the literal `off`.
  if (lower === "off") return { name, value: "off", known: true };
  return { name, value: parsePositiveInt(lower, name, MAX_LINE_LENGTH), known: true };
}

function sortProperties(names: readonly string[]): string[] {
  const knownRank = new Map<string, number>(KNOWN_PROPERTY_ORDER.map((n, i) => [n, i]));
  return [...names].sort((a, b) => {
    const ra = knownRank.get(a);
    const rb = knownRank.get(b);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/* ── glob handling (EditorConfig's own dialect, know-how #5) ──────────────── */

const REGEX_SMELL = /(^\^)|(\$$)|\\[dwsb]|\.\*|\.\+|\(|\)|\|/;

interface GlobCheck {
  readonly glob: string;
  readonly warnings: readonly EditorconfigWarning[];
}

/** Reject structurally broken globs; repair an empty one instead of emitting `[]`. */
function normalizeGlob(raw: string): GlobCheck {
  const trimmed = raw.trim();
  const warnings: EditorconfigWarning[] = [];
  if (/[\r\n]/.test(raw)) reject("a glob must not contain a line break");
  if (trimmed === "") {
    return {
      glob: "*",
      warnings: [
        {
          code: "empty_glob",
          level: "warning",
          message: 'Empty glob replaced with "*" — an empty section header matches nothing.',
          glob: "*",
        },
      ],
    };
  }

  let inClass = false;
  let braceDepth = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "]") {
      // A bare "]" would close the section header early: `[*.[jt]s]` parses as
      // the glob `*.[jt]s` plus a stray character.
      reject(`glob "${trimmed}" contains an unescaped "]" outside a [character class]`);
    }
    if (ch === "[") inClass = true;
    else if (ch === "{") braceDepth += 1;
    else if (ch === "}") {
      braceDepth -= 1;
      if (braceDepth < 0) reject(`glob "${trimmed}" closes a "}" that was never opened`);
    }
  }
  if (inClass) reject(`glob "${trimmed}" has an unclosed "[" character class`);
  if (braceDepth !== 0) reject(`glob "${trimmed}" has an unclosed "{" group`);

  if (REGEX_SMELL.test(trimmed)) {
    warnings.push({
      code: "glob_looks_like_regex",
      level: "warning",
      message: `"${trimmed}" looks like a regular expression. EditorConfig globs use *, **, ?, [name], [!name], {a,b} and {n1..n2} — a regex silently matches nothing.`,
      glob: trimmed,
    });
  }
  return { glob: trimmed, warnings };
}

const MAX_EXPANSIONS = 64;
const MAX_RANGE = 32;

/**
 * Expand `{a,b}` alternation and `{n1..n2}` ranges into concrete patterns.
 * Returns null when the expansion is unbounded/too large — the overlap analysis
 * then reports "unknown" rather than guessing.
 */
export function expandGlob(glob: string): string[] | null {
  const open = findUnescaped(glob, "{");
  if (open === -1) return [glob];
  const close = matchingBrace(glob, open);
  if (close === -1) return null;
  const head = glob.slice(0, open);
  const body = glob.slice(open + 1, close);
  const tail = glob.slice(close + 1);

  const range = /^(-?\d+)\.\.(-?\d+)$/.exec(body);
  let alternatives: string[];
  if (range) {
    const from = Number.parseInt(range[1] as string, 10);
    const to = Number.parseInt(range[2] as string, 10);
    const step = from <= to ? 1 : -1;
    if (Math.abs(to - from) + 1 > MAX_RANGE) return null;
    alternatives = [];
    for (let n = from; step > 0 ? n <= to : n >= to; n += step) alternatives.push(String(n));
  } else {
    alternatives = splitTopLevel(body);
  }

  const out: string[] = [];
  for (const alt of alternatives) {
    const expanded = expandGlob(`${head}${alt}${tail}`);
    if (expanded === null) return null;
    out.push(...expanded);
    if (out.length > MAX_EXPANSIONS) return null;
  }
  return out;
}

function findUnescaped(text: string, ch: string): number {
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === ch) return i;
  }
  return -1;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] as string;
    if (ch === "\\") {
      current += ch + (body[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

const UNIVERSAL = new Set(["*", "**", "**/*"]);
const WILDCARD_CHARS = /[*?[\]{}!]/;

function extensionOf(pattern: string): string | null {
  const m = /^(?:\*\*\/)?\*(\.[^*?[\]{}]+)$/.exec(pattern);
  return m ? (m[1] as string) : null;
}

function basenameOf(pattern: string): string | null {
  const m = /^(?:\*\*\/)?([^/*?[\]{}]+)$/.exec(pattern);
  return m ? (m[1] as string) : null;
}

/**
 * Decidable overlap on a deliberately restricted sub-language (the brief's open
 * question #4 asked for a concrete approximation instead of a full, undecidable
 * glob-intersection analysis):
 *   true  — provably overlapping (identical, universal, same extension, or an
 *           extension pattern against a concrete filename with that extension)
 *   false — provably disjoint (two different concrete filenames / extensions)
 *   null  — not decidable here; we stay silent rather than warn wrongly
 */
export function globsOverlap(a: string, b: string): boolean | null {
  if (a === b) return true;
  const left = expandGlob(a);
  const right = expandGlob(b);
  if (left === null || right === null) return null;

  let sawUnknown = false;
  for (const l of left) {
    for (const r of right) {
      const verdict = literalOverlap(l, r);
      if (verdict === true) return true;
      if (verdict === null) sawUnknown = true;
    }
  }
  return sawUnknown ? null : false;
}

function literalOverlap(a: string, b: string): boolean | null {
  if (a === b) return true;
  if (UNIVERSAL.has(a) || UNIVERSAL.has(b)) return true;

  const extA = extensionOf(a);
  const extB = extensionOf(b);
  if (extA && extB) return extA === extB;

  const baseA = basenameOf(a);
  const baseB = basenameOf(b);
  if (extA && baseB && !WILDCARD_CHARS.test(baseB)) return baseB.endsWith(extA);
  if (extB && baseA && !WILDCARD_CHARS.test(baseA)) return baseA.endsWith(extB);
  if (baseA && baseB && !WILDCARD_CHARS.test(baseA) && !WILDCARD_CHARS.test(baseB)) {
    return baseA === baseB;
  }
  return null;
}

/* ── domain warnings ──────────────────────────────────────────────────────── */

function propertyWarnings(section: NormalizedSection): EditorconfigWarning[] {
  const out: EditorconfigWarning[] = [];
  const props = section.properties;

  if (props.charset === "utf-8-bom") {
    out.push({
      code: "charset_bom",
      level: "warning",
      glob: section.glob,
      property: "charset",
      message:
        "charset = utf-8-bom writes a byte-order mark. It breaks shebang lines and several toolchains read it inconsistently — prefer utf-8 unless a consumer demands the BOM.",
    });
  }
  if (props.indent_size === "tab" && props.indent_style !== "tab") {
    out.push({
      code: "indent_size_tab_without_tab_style",
      level: "warning",
      glob: section.glob,
      property: "indent_size",
      message:
        "indent_size = tab only means something when indent_style = tab; set indent_style = tab or give indent_size a number.",
    });
  }
  if (
    props.indent_style === "tab" &&
    props.indent_size !== undefined &&
    /^\d+$/.test(props.indent_size) &&
    props.tab_width === undefined
  ) {
    out.push({
      code: "tab_width_defaults_to_indent_size",
      level: "info",
      glob: section.glob,
      property: "tab_width",
      message: `tab_width is unset, so editors render a tab as ${props.indent_size} columns (it defaults to indent_size). Set tab_width explicitly if you want them to differ.`,
    });
  }
  for (const [name, value] of Object.entries(props)) {
    if (!KNOWN_PROPERTIES.has(name)) {
      out.push({
        code: "unknown_property",
        level: "info",
        glob: section.glob,
        property: name,
        message: `"${name} = ${value}" is not a core EditorConfig property. Editors that do not know it ignore it silently.`,
      });
    }
  }
  return out;
}

/**
 * Later-declared sections win (know-how #2) — this is declaration order, not
 * CSS-style specificity, and it is the single most common misreading of the
 * format. Identical globs are a mistake worth a warning; a genuine narrowing
 * override is expected and only reported when the values actually differ.
 */
function shadowWarnings(sections: readonly NormalizedSection[]): EditorconfigWarning[] {
  const out: EditorconfigWarning[] = [];
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const earlier = sections[i] as NormalizedSection;
      const later = sections[j] as NormalizedSection;
      if (globsOverlap(earlier.glob, later.glob) !== true) continue;
      const identical = earlier.glob === later.glob;
      for (const [name, value] of Object.entries(earlier.properties)) {
        const overriding = later.properties[name];
        if (overriding === undefined) continue;
        if (!identical && overriding === value) continue;
        out.push({
          code: identical ? "duplicate_glob" : "shadowed_property",
          level: identical ? "warning" : "info",
          glob: later.glob,
          property: name,
          message: identical
            ? `Two sections share the glob [${earlier.glob}]. The later one wins, so ${name} resolves to "${overriding}", not "${value}" — merge them.`
            : `[${later.glob}] is declared after [${earlier.glob}] and both match, so ${name} resolves to "${overriding}" for files matching both. EditorConfig resolves by declaration order, not by how specific a glob looks.`,
        });
      }
    }
  }
  return out;
}

/* ── generation ───────────────────────────────────────────────────────────── */

interface SectionInput {
  glob?: string;
  properties?: Record<string, string | number | boolean>;
}

function normalizeSections(raw: readonly SectionInput[]): {
  sections: NormalizedSection[];
  warnings: EditorconfigWarning[];
} {
  const warnings: EditorconfigWarning[] = [];
  const sections: NormalizedSection[] = [];
  for (const entry of raw) {
    const checked = normalizeGlob(entry.glob ?? "*");
    warnings.push(...checked.warnings);
    const properties: Record<string, string> = {};
    for (const [rawName, rawValue] of Object.entries(entry.properties ?? {})) {
      const prop = normalizeProperty(rawName, rawValue);
      if (properties[prop.name] !== undefined && properties[prop.name] !== prop.value) {
        reject(`[${checked.glob}] sets ${prop.name} twice with different values`);
      }
      properties[prop.name] = prop.value;
    }
    const section: NormalizedSection = { glob: checked.glob, properties };
    warnings.push(...propertyWarnings(section));
    if (Object.keys(properties).length === 0) {
      warnings.push({
        code: "empty_section",
        level: "warning",
        glob: checked.glob,
        message: `[${checked.glob}] has no properties, so it is omitted — a section header alone changes nothing.`,
      });
      continue;
    }
    sections.push(section);
  }
  return { sections, warnings };
}

function render(root: boolean, sections: readonly NormalizedSection[]): string {
  const blocks: string[] = [];
  // Spec: `root` is a preamble property and must precede any section header.
  if (root) blocks.push("root = true\n");
  for (const section of sections) {
    const lines = [`[${section.glob}]`];
    for (const name of sortProperties(Object.keys(section.properties))) {
      lines.push(`${name} = ${section.properties[name]}`);
    }
    blocks.push(`${lines.join("\n")}\n`);
  }
  // Trailing newline on purpose: the file should satisfy its own
  // insert_final_newline = true.
  return blocks.join("\n");
}

function generate(root: boolean, rawSections: readonly SectionInput[]): EditorconfigResult {
  const { sections, warnings } = normalizeSections(rawSections);
  const all = [...warnings, ...shadowWarnings(sections)];
  if (!root) {
    all.push({
      code: "not_root",
      level: "info",
      message:
        "root = true is omitted, so editors keep walking up the directory tree and merge any parent .editorconfig. Enable it for the file at the top of a repository.",
    });
  }
  const propertyCount = sections.reduce((n, s) => n + Object.keys(s.properties).length, 0);
  return {
    editorconfig: render(root, sections),
    filename: EDITORCONFIG_FILENAME,
    root,
    sections,
    propertyCount,
    warnings: all,
  };
}

/* ── parsing (paste-to-import / canonicalise) ─────────────────────────────── */

const MAX_SOURCE_LINES = 5_000;

/**
 * Parse an existing `.editorconfig` back into the generator's own input shape.
 * Comments (`#`, `;`) and blank lines are dropped; keys and values are
 * lowercased through the same normalizer the form path uses, so importing then
 * re-emitting is idempotent (know-how #8).
 */
export function parseEditorconfig(source: string): {
  root: boolean;
  sections: SectionInput[];
  warnings: EditorconfigWarning[];
} {
  const text = source.replace(/^﻿/, "");
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > MAX_SOURCE_LINES) {
    reject(`.editorconfig has ${lines.length} lines; the limit is ${MAX_SOURCE_LINES}`);
  }
  const warnings: EditorconfigWarning[] = [];
  const sections: SectionInput[] = [];
  let root = false;
  let current: SectionInput | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] as string).trim();
    if (line === "" || line.startsWith("#") || line.startsWith(";")) continue;

    if (line.startsWith("[")) {
      if (!line.endsWith("]")) reject(`line ${i + 1}: section header "${line}" is missing "]"`);
      current = { glob: line.slice(1, -1).trim(), properties: {} };
      sections.push(current);
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1)
      reject(`line ${i + 1}: "${line}" is neither a comment, a section nor key = value`);
    const key = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();

    if (current === null) {
      if (key === "root") {
        const lower = value.toLowerCase();
        if (lower !== "true" && lower !== "false") {
          reject(`line ${i + 1}: root must be true or false (got "${value}")`);
        }
        root = lower === "true";
        continue;
      }
      warnings.push({
        code: "preamble_property_ignored",
        level: "warning",
        property: key,
        message: `line ${i + 1}: "${key}" appears before any [section] header. Only root is defined there, so it is dropped.`,
      });
      continue;
    }
    if (key === "root") {
      reject(`line ${i + 1}: root must appear before the first [section] header`);
    }
    (current.properties as Record<string, string>)[key] = value;
  }

  return { root, sections, warnings };
}

/* ── tool ─────────────────────────────────────────────────────────────────── */

const propertyValueSchema = z.union([z.string().min(1).max(200), z.number(), z.boolean()]);

const sectionSchema = z.object({
  glob: z
    .string()
    .max(200)
    .default("*")
    .describe(
      'EditorConfig glob for the section header, e.g. "*", "*.md", "Makefile", "*.{yml,yaml}", "lib/**.js". Wildcards: * ** ? [name] [!name] {a,b} {n1..n2} — not regex.',
    ),
  properties: z
    .record(z.string().min(1).max(64), propertyValueSchema)
    .default({})
    .describe(
      'Property map. Core keys: indent_style (tab|space), indent_size (1-64|tab), tab_width (1-64), end_of_line (lf|cr|crlf), charset (latin1|utf-8|utf-8-bom|utf-16be|utf-16le), trim_trailing_whitespace (bool), insert_final_newline (bool), max_line_length (1-10000|off). Any property also accepts "unset" to cancel an inherited value. Unknown keys pass through.',
    ),
});

const inputSchema = z
  .object({
    root: z
      .boolean()
      .default(true)
      .describe(
        "Emit `root = true`. True stops EditorConfig-aware editors from merging parent-directory .editorconfig files — correct for the file at a repository root, wrong for a nested override.",
      ),
    sections: z
      .array(sectionSchema)
      .min(1)
      .max(50)
      .optional()
      .describe("Glob sections in declaration order. Later sections win on shared properties."),
    source: z
      .string()
      .max(200_000)
      .optional()
      .describe(
        "Existing .editorconfig text to import instead of `sections`. Parsed, normalized and re-emitted canonically; its own `root` value overrides the `root` field.",
      ),
  })
  .refine((v) => (v.sections === undefined) !== (v.source === undefined), {
    message: "provide exactly one of `sections` or `source`",
  });

export const editorconfigGeneratorTool = tool({
  id: "dev/editorconfig-generator",
  slug: "editorconfig-generator",
  category: "dev",
  title: { zh: ".editorconfig 生成器", en: ".editorconfig Generator" },
  description: {
    zh: "按 glob 分节生成 .editorconfig，校验属性取值，并提示后声明分节覆盖前者等易错点；也可粘贴已有文件规范化导入",
    en: "Generate a spec-valid .editorconfig from glob sections, validate every property value, and flag the footguns (later section wins, utf-8-bom, indent_size vs tab_width); can also import an existing file",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.editorconfig_generator",
  roots: ["generator", "template"],
  engine: {
    name: "EditorConfig File Format Specification",
    upstream: "editorconfig.org specification (properties + wildcard patterns)",
    version: "0.17.x properties set",
  },
  seoKeywords: {
    zh: "editorconfig生成器,editorconfig配置,editorconfig模板,缩进配置文件",
    en: "editorconfig generator, generate .editorconfig, editorconfig template, editorconfig example",
  },
  inputSchema,
  execute: (input: {
    root?: boolean;
    sections?: SectionInput[];
    source?: string;
  }): EditorconfigResult => {
    if (input.source !== undefined) {
      const parsed = parseEditorconfig(input.source);
      const result = generate(parsed.root, parsed.sections);
      return { ...result, warnings: [...parsed.warnings, ...result.warnings] };
    }
    return generate(input.root ?? true, input.sections ?? []);
  },
});

export const editorconfigGeneratorTools: readonly AnyForgeToolDefinition[] = [
  editorconfigGeneratorTool,
];
