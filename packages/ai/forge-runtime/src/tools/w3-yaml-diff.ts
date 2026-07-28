/**
 * yaml-diff — semantic comparison of two YAML (or JSON) documents.
 * Brief: docs/plans/tools/yaml-diff.md (Comparator root, archetype §8 two-pane).
 *
 * A plain text diff of a Kubernetes manifest or a Helm `values.yaml` lights up
 * on key order, quoting and indentation as loudly as on a changed image tag.
 * The question a config reviewer actually arrives with is "did the *behaviour*
 * change" (§1). So this compares parsed structure, and it takes an explicit
 * position on every domain fork the brief names (§7):
 *
 *  1. Mapping key order is noise; sequence order is meaning. Maps are compared
 *     by key, sequences are never sorted — a reordered list is a real change
 *     and is reported as one (`[order]`).
 *  2. Anchors/aliases are resolved to their values before comparing, so a value
 *     edit behind a shared `&anchor` shows up at every `*alias` site; the
 *     anchor/alias *structure* is still reported as a secondary `structural`
 *     row when it changes with the resolved value intact. `resolveAnchors:false`
 *     compares the unexpanded document instead, for authors who care about
 *     DRY-ness rather than resolved value.
 *  3. Merge keys (`<<: *defaults`) are expanded before diffing — otherwise an
 *     inherited key reads as "missing" from a document that in fact has it.
 *     Own keys win over merged ones regardless of where `<<` sits.
 *  4. The Norway problem: comparison uses the YAML 1.2 Core Schema, where only
 *     `true`/`false` are booleans, so `country: NO` is the string "NO". A
 *     document that leans on YAML 1.1 implicit typing (unquoted NO/YES/ON/OFF/
 *     Y/N) is flagged (`yaml11-ambiguous-scalars`) rather than silently
 *     reinterpreted.
 *  5. Type is part of the value: `8080` vs `"8080"` vs `!!str 8080` are
 *     reported as `type-change`, not folded into a generic "changed".
 *  6. Sequences of mappings are matched by an identity field (`name`/`id`/`key`
 *     by default, and only when that field is present and unique on both
 *     sides) so one inserted container does not cascade into a wall of false
 *     changes; positional matching otherwise.
 *  7. Block scalar style: comparison is on the *resolved* string, so `|-` vs
 *     `|` (a trailing newline that survives or not) is a real value change,
 *     while a `|` → `>` restyle with an identical resolved value is a
 *     `structural` row.
 *  8. Comments are not part of the data model and are not compared (stated
 *     policy, matching every competitor examined; comment-aware diffing is
 *     deliberately deferred, brief §9.4).
 *  9. Multi-document `---` streams are paired positionally document by
 *     document, and a count mismatch is reported (`documentCountMismatch`) —
 *     never a silent truncation to document 1.
 * 10. Duplicate keys inside one mapping are a real defect in the input: the
 *     last occurrence wins (JS object semantics) and the fact is surfaced as
 *     `duplicateKeyWarnings`, never swallowed.
 *
 * Specs implemented: YAML 1.2.2 §10.2 (Core Schema resolution), YAML 1.2.2 §7.1
 * (alias nodes) and §8.1.1.2 (block chomping indicators), the YAML 1.1 merge-key
 * type `tag:yaml.org,2002:merge`, and RFC 8259 (JSON, compared as the YAML
 * subset it is). Parsing is js-yaml 5.x; the diff itself is ours.
 *
 * Deterministic and `pure`: no clock, no randomness, no network, no fs.
 */
import { createTwoFilesPatch, diffLines } from "diff";
import * as yaml from "js-yaml";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

const MAX_TEXT_CHARS = 2_000_000;
/** Past this the list stops being readable and starts being a memory problem. */
const MAX_CHANGES = 2_000;
/** How many ambiguous YAML-1.1 scalars are worth naming before a list stops helping. */
const MAX_NAMED_PATHS = 20;
/** Fields that identify an item in devops YAML sequences (know-how #6). */
export const DEFAULT_IDENTITY_FIELDS = ["name", "id", "key"] as const;

/** Merge key support is YAML 1.1; the rest is the YAML 1.2.2 Core Schema. */
const SCHEMA = yaml.CORE_SCHEMA.withTags(yaml.mergeTag);

/**
 * `json: true` relaxes exactly one rule in js-yaml's constructor: a duplicate
 * mapping key stops being fatal and becomes last-wins. Merge-key precedence is
 * unaffected. We want both — the duplicate is reported as a warning instead of
 * killing an otherwise readable diff (know-how #10).
 */
const LOAD_OPTIONS = { schema: SCHEMA, json: true } as const;

/** Unquoted tokens YAML 1.1 reads as booleans and YAML 1.2 Core reads as strings. */
const YAML11_BOOL = /^(y|n|yes|no|on|off)$/i;

/** Key that needs no quoting in a path expression. */
const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * `resolveAnchors: false` needs a value that means "this node was a `*name`
 * reference". A magic string key (`{ $alias: "name" }`) would collide with a
 * document that genuinely holds a one-key `$alias` mapping — and then a real
 * value change reads as an alias restructure and the documents are called
 * equivalent. A nominal class cannot be forged by any parsed YAML value.
 */
class AliasRef {
  constructor(readonly anchor: string) {}
}

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type YamlDiffMode = "semantic" | "raw-text";
export type YamlChangeType = "added" | "removed" | "value" | "type-change" | "structural";

export interface YamlParseError {
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export interface YamlDiffChange {
  readonly path: string;
  readonly changeType: YamlChangeType;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly beforeType?: string;
  readonly afterType?: string;
  /** Stable code explaining *why* this row exists when the path alone cannot. */
  readonly note?: string;
}

export interface YamlDiffNote {
  readonly code: string;
  readonly message: string;
  readonly detail?: string;
}

export interface YamlDuplicateKeyWarning {
  readonly document: "original" | "changed";
  readonly path: string;
  readonly message: string;
}

export interface YamlDiffSummary {
  readonly added: number;
  readonly removed: number;
  readonly changed: number;
  readonly typeChanged: number;
  readonly structural: number;
}

export interface YamlDiffOutput {
  readonly mode: YamlDiffMode;
  /** True only when nothing but formatting/anchor structure differs. */
  readonly equivalent: boolean;
  readonly parseErrors: { original?: YamlParseError; changed?: YamlParseError };
  readonly documentCountMismatch?: { originalCount: number; changedCount: number };
  readonly documents: { original: number; changed: number };
  readonly summary: YamlDiffSummary;
  readonly changes: readonly YamlDiffChange[];
  readonly truncated: boolean;
  readonly duplicateKeyWarnings: readonly YamlDuplicateKeyWarning[];
  readonly notes: readonly YamlDiffNote[];
  /** Unified patch over normalised YAML (semantic) or the raw text (raw-text). */
  readonly unified: string;
  readonly engine: "nebutra-yaml-diff";
}

/* ── parsing ───────────────────────────────────────────────────────────── */

interface ParsedYaml {
  readonly values: readonly unknown[];
  readonly ast: readonly yaml.Document[];
}

type ParseResult = { ok: true; parsed: ParsedYaml } | { ok: false; error: YamlParseError };

function toParseError(err: unknown): YamlParseError {
  if (err instanceof yaml.YAMLException) {
    return {
      line: (err.mark?.line ?? 0) + 1,
      column: (err.mark?.column ?? 0) + 1,
      message: err.reason,
    };
  }
  return { line: 1, column: 1, message: err instanceof Error ? err.message : String(err) };
}

function parseYaml(text: string): ParseResult {
  try {
    const events = yaml.parseEvents(text, {});
    const ast = yaml.eventsToAst(events, { source: text, schema: SCHEMA });
    const values = yaml.loadAll(text, LOAD_OPTIONS);
    return { ok: true, parsed: { values, ast } };
  } catch (err) {
    return { ok: false, error: toParseError(err) };
  }
}

/**
 * Cheap parse-validity probe for a live per-pane badge. Same parser as the
 * diff, so the badge cannot disagree with the result.
 */
export function validateYamlText(
  text: string,
): { ok: true; documents: number } | ({ ok: false } & YamlParseError) {
  const result = parseYaml(text);
  if (result.ok) return { ok: true, documents: result.parsed.values.length };
  return { ok: false, ...result.error };
}

/* ── paths ─────────────────────────────────────────────────────────────── */

function childPath(parent: string, key: string): string {
  if (PLAIN_KEY.test(key)) return parent ? `${parent}.${key}` : key;
  return `${parent}[${JSON.stringify(key)}]`;
}

function indexPath(parent: string, index: number): string {
  return `${parent}[${index}]`;
}

function identityPath(parent: string, field: string, value: string): string {
  return `${parent}[${field}=${value}]`;
}

/* ── value typing ──────────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof AliasRef)
  );
}

function isAliasMarker(value: unknown): value is AliasRef {
  return value instanceof AliasRef;
}

/**
 * The resolved type, which is half of what is being compared: `8080` and
 * `"8080"` hold the same characters and are not the same value (know-how #5).
 */
export function yamlTypeOf(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (isAliasMarker(value)) return "alias";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "timestamp";
  if (value instanceof Uint8Array) return "binary";
  if (typeof value === "object") return "map";
  return typeof value;
}

function scalarEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
  }
  return Object.is(a, b);
}

/* ── AST walk: structure, duplicates, YAML 1.1 traps ───────────────────── */

interface StructuralFact {
  readonly anchor?: string;
  readonly alias?: string;
  /** Explicit tag written in the source (`!!str`), not the resolved tag. */
  readonly explicitTag?: string;
  readonly blockStyle?: "literal" | "folded";
}

interface AstScan {
  readonly structure: Map<string, StructuralFact>;
  readonly duplicateKeys: string[];
  readonly ambiguousScalars: string[];
  readonly usesMergeKeys: boolean;
  readonly usesAnchors: boolean;
}

function astKeyToString(node: yaml.Node): string {
  if (node.kind === "scalar") return node.value;
  if (node.kind === "alias") return `*${node.anchor}`;
  return node.kind === "sequence" ? "[?]" : "{?}";
}

function factOf(node: yaml.Node): StructuralFact {
  const fact: {
    anchor?: string;
    alias?: string;
    explicitTag?: string;
    blockStyle?: "literal" | "folded";
  } = {};
  if (node.kind === "alias") fact.alias = node.anchor;
  else if (node.anchor) fact.anchor = node.anchor;
  if (node.style.tagged && node.tag) fact.explicitTag = node.tag;
  if (node.kind === "scalar") {
    if (node.style.literal) fact.blockStyle = "literal";
    else if (node.style.folded) fact.blockStyle = "folded";
  }
  return fact;
}

function factIsEmpty(fact: StructuralFact): boolean {
  return (
    fact.anchor === undefined &&
    fact.alias === undefined &&
    fact.explicitTag === undefined &&
    fact.blockStyle === undefined
  );
}

function scanAst(documents: readonly yaml.Document[], multiDoc: boolean): AstScan {
  const structure = new Map<string, StructuralFact>();
  const duplicateKeys: string[] = [];
  const ambiguousScalars: string[] = [];
  let usesMergeKeys = false;
  let usesAnchors = false;

  const walk = (node: yaml.Node, path: string): void => {
    const fact = factOf(node);
    if (!factIsEmpty(fact)) structure.set(path, fact);
    if (fact.anchor || fact.alias) usesAnchors = true;

    if (node.kind === "scalar") {
      const plain =
        !node.style.tagged &&
        !node.style.singleQuoted &&
        !node.style.doubleQuoted &&
        !node.style.literal &&
        !node.style.folded;
      if (plain && YAML11_BOOL.test(node.value) && ambiguousScalars.length < MAX_NAMED_PATHS) {
        ambiguousScalars.push(path || "(root)");
      }
      return;
    }
    if (node.kind === "alias") return;
    if (node.kind === "sequence") {
      node.items.forEach((item, index) => {
        walk(item, indexPath(path, index));
      });
      return;
    }
    const seen = new Set<string>();
    for (const { key, value } of node.items) {
      const name = astKeyToString(key);
      if (name === "<<") {
        usesMergeKeys = true;
        continue;
      }
      const next = childPath(path, name);
      if (seen.has(name) && duplicateKeys.length < MAX_NAMED_PATHS) duplicateKeys.push(next);
      seen.add(name);
      walk(value, next);
    }
  };

  documents.forEach((document, index) => {
    if (!document.contents) return;
    walk(document.contents, multiDoc ? `doc[${index}]` : "");
  });

  return { structure, duplicateKeys, ambiguousScalars, usesMergeKeys, usesAnchors };
}

/* ── unresolved (anchor-preserving) values ─────────────────────────────── */

/**
 * Build values straight off the AST with aliases left as `*name` markers, for
 * `resolveAnchors: false`. Scalars are resolved by the schema's own tag
 * resolvers, so this cannot drift from the resolved path's typing.
 */
function astToValue(node: yaml.Node): unknown {
  switch (node.kind) {
    case "alias":
      return new AliasRef(node.anchor);
    case "sequence":
      return node.items.map(astToValue);
    case "mapping": {
      const out: Record<string, unknown> = {};
      for (const { key, value } of node.items) out[astKeyToString(key)] = astToValue(value);
      return out;
    }
    default: {
      const definition = SCHEMA.exact.scalar[node.tag];
      if (!definition) return node.value;
      const resolved = definition.resolve(node.value, node.style.tagged, node.tag);
      return resolved === yaml.NOT_RESOLVED ? node.value : resolved;
    }
  }
}

/* ── the structural diff ───────────────────────────────────────────────── */

interface MutableSummary {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  structural: number;
}

interface DiffContext {
  readonly changes: YamlDiffChange[];
  readonly identityFields: readonly string[];
  readonly identityUsed: Set<string>;
  /**
   * Every path a value comparison reported on, in *both* the identity form
   * (`items[name=a].v`) and the positional form the AST scan uses
   * (`items[0].v`) — otherwise a node whose value changed also collects a
   * "structure-only" row, which asserts the exact opposite.
   */
  readonly valueChanged: Set<string>;
  /** identity-path prefix → positional-path prefix, for the rewrite above. */
  readonly identityAlias: Map<string, string>;
  /**
   * Sequences matched by identity whose shared items were re-ordered. Structural
   * facts under them are indexed by position on each side, so the two sides no
   * longer line up and any comparison of them would be noise.
   */
  readonly reorderedSequences: Set<string>;
  /** Counted for every change, including ones the cap stops us from listing. */
  readonly summary: MutableSummary;
  truncated: boolean;
}

function countChange(summary: MutableSummary, type: YamlChangeType): void {
  if (type === "added") summary.added += 1;
  else if (type === "removed") summary.removed += 1;
  else if (type === "value") summary.changed += 1;
  else if (type === "type-change") summary.typeChanged += 1;
  else summary.structural += 1;
}

function push(ctx: DiffContext, change: YamlDiffChange): void {
  // The summary is a fact about the documents, not about how much of the list
  // fitted — count first, then decide whether this row is still listable.
  countChange(ctx.summary, change.changeType);
  if (change.changeType !== "structural") {
    ctx.valueChanged.add(change.path);
    const positional = toPositionalPath(ctx, change.path);
    if (positional !== change.path) ctx.valueChanged.add(positional);
  }
  if (ctx.changes.length >= MAX_CHANGES) {
    ctx.truncated = true;
    return;
  }
  ctx.changes.push(change);
}

/** Rewrite every `seq[field=value]` segment back to the `seq[index]` the AST used. */
function toPositionalPath(ctx: DiffContext, path: string): string {
  if (ctx.identityAlias.size === 0) return path;
  let out = path;
  // Longest prefix first: an outer sequence rewrite must not strand an inner one.
  const prefixes = [...ctx.identityAlias.keys()].sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (out === prefix || out.startsWith(`${prefix}.`) || out.startsWith(`${prefix}[`)) {
      out = (ctx.identityAlias.get(prefix) as string) + out.slice(prefix.length);
    }
  }
  return out;
}

function isIdentityValue(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

/**
 * An identity field must exist, be scalar, and be unique on *both* sides —
 * anything weaker turns a positional cascade into a wrong pairing (know-how #6).
 */
export function pickIdentityField(
  left: readonly unknown[],
  right: readonly unknown[],
  candidates: readonly string[],
): string | null {
  if (left.length === 0 || right.length === 0) return null;
  const items = [...left, ...right];
  if (!items.every(isPlainObject)) return null;
  for (const field of candidates) {
    if (!items.every((item) => isIdentityValue((item as Record<string, unknown>)[field]))) continue;
    const unique = (side: readonly unknown[]) =>
      new Set(side.map((item) => String((item as Record<string, unknown>)[field]))).size ===
      side.length;
    if (unique(left) && unique(right)) return field;
  }
  return null;
}

function diffSequenceByIdentity(
  left: readonly unknown[],
  right: readonly unknown[],
  field: string,
  path: string,
  ctx: DiffContext,
): void {
  ctx.identityUsed.add(field);
  const keyOf = (item: unknown) => String((item as Record<string, unknown>)[field]);
  const rightByKey = new Map(right.map((item) => [keyOf(item), item]));
  const leftKeys = left.map(keyOf);
  const rightKeys = right.map(keyOf);
  const leftSet = new Set(leftKeys);

  left.forEach((item, index) => {
    const key = keyOf(item);
    const counterpart = rightByKey.get(key);
    const at = identityPath(path, field, key);
    // The AST scan indexes structural facts by position; remember which index
    // this identity stood at so a value change can suppress the structural row
    // for the same node (see toPositionalPath).
    ctx.identityAlias.set(at, indexPath(path, index));
    if (counterpart === undefined) {
      push(ctx, { path: at, changeType: "removed", before: item, beforeType: yamlTypeOf(item) });
      return;
    }
    diffValues(item, counterpart, at, ctx);
  });
  for (const item of right) {
    if (leftSet.has(keyOf(item))) continue;
    push(ctx, {
      path: identityPath(path, field, keyOf(item)),
      changeType: "added",
      after: item,
      afterType: yamlTypeOf(item),
    });
  }

  // Sequence order is meaning, not formatting (know-how #1): matching by
  // identity must not hide a reorder of the items both sides share. When the
  // shared order does differ, positions no longer agree across the two sides,
  // so the AST's positional structural facts under this sequence cannot be
  // lined up honestly either — `reorderedSequences` stops diffStructure from
  // trying (see diffStructure).
  const commonLeft = leftKeys.filter((key) => rightKeys.includes(key));
  const commonRight = rightKeys.filter((key) => leftSet.has(key));
  if (commonLeft.join("\u0000") !== commonRight.join("\u0000")) {
    ctx.reorderedSequences.add(path);
    push(ctx, {
      path: `${path}[order]`,
      changeType: "value",
      before: commonLeft,
      after: commonRight,
      beforeType: "array",
      afterType: "array",
      note: "sequence-order-changed",
    });
  }
}

function diffSequencePositionally(
  left: readonly unknown[],
  right: readonly unknown[],
  path: string,
  ctx: DiffContext,
): void {
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i += 1) diffValues(left[i], right[i], indexPath(path, i), ctx);
  for (let i = shared; i < left.length; i += 1) {
    push(ctx, {
      path: indexPath(path, i),
      changeType: "removed",
      before: left[i],
      beforeType: yamlTypeOf(left[i]),
    });
  }
  for (let i = shared; i < right.length; i += 1) {
    push(ctx, {
      path: indexPath(path, i),
      changeType: "added",
      after: right[i],
      afterType: yamlTypeOf(right[i]),
    });
  }
}

function diffValues(left: unknown, right: unknown, path: string, ctx: DiffContext): void {
  const leftType = yamlTypeOf(left);
  const rightType = yamlTypeOf(right);
  if (leftType !== rightType) {
    push(ctx, {
      path: path || "(root)",
      changeType: "type-change",
      before: left,
      after: right,
      beforeType: leftType,
      afterType: rightType,
    });
    return;
  }

  if (leftType === "map") {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    for (const key of Object.keys(a)) {
      if (!Object.hasOwn(b, key)) {
        push(ctx, {
          path: childPath(path, key),
          changeType: "removed",
          before: a[key],
          beforeType: yamlTypeOf(a[key]),
        });
        continue;
      }
      diffValues(a[key], b[key], childPath(path, key), ctx);
    }
    for (const key of Object.keys(b)) {
      if (Object.hasOwn(a, key)) continue;
      push(ctx, {
        path: childPath(path, key),
        changeType: "added",
        after: b[key],
        afterType: yamlTypeOf(b[key]),
      });
    }
    return;
  }

  if (leftType === "array") {
    const a = left as unknown[];
    const b = right as unknown[];
    const field = pickIdentityField(a, b, ctx.identityFields);
    if (field) diffSequenceByIdentity(a, b, field, path, ctx);
    else diffSequencePositionally(a, b, path, ctx);
    return;
  }

  if (leftType === "alias") {
    const a = (left as AliasRef).anchor;
    const b = (right as AliasRef).anchor;
    if (a !== b) {
      push(ctx, {
        path: path || "(root)",
        changeType: "structural",
        before: `*${a}`,
        after: `*${b}`,
        beforeType: "alias",
        afterType: "alias",
        note: "alias-target-changed",
      });
    }
    return;
  }

  if (!scalarEqual(left, right)) {
    push(ctx, {
      path: path || "(root)",
      changeType: "value",
      before: left,
      after: right,
      beforeType: leftType,
      afterType: rightType,
    });
  }
}

/**
 * Anchor / alias / explicit-tag / block-scalar facts whose resolved value did
 * not change (know-how #2, #5, #7). Quoting and flow-vs-block are deliberately
 * *not* reported: those are the formatting noise semantic mode exists to drop.
 */
function diffStructure(
  left: ReadonlyMap<string, StructuralFact>,
  right: ReadonlyMap<string, StructuralFact>,
  ctx: DiffContext,
): void {
  const underReorderedSequence = (path: string): boolean => {
    for (const sequence of ctx.reorderedSequences) {
      if (path.startsWith(`${sequence}[`)) return true;
    }
    return false;
  };
  const describe = (fact: StructuralFact | undefined): string => {
    if (!fact) return "—";
    const parts: string[] = [];
    if (fact.anchor) parts.push(`&${fact.anchor}`);
    if (fact.alias) parts.push(`*${fact.alias}`);
    if (fact.explicitTag) parts.push(fact.explicitTag);
    if (fact.blockStyle) parts.push(fact.blockStyle);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  for (const path of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    // A "structure-only" row claims the resolved value did not change. If this
    // node already produced a value/type/added/removed row — under either the
    // positional or the identity spelling of its path — that claim is false.
    if (ctx.valueChanged.has(path || "(root)")) continue;
    if (underReorderedSequence(path)) continue;
    const before = describe(left.get(path));
    const after = describe(right.get(path));
    if (before === after) continue;
    push(ctx, {
      path: path || "(root)",
      changeType: "structural",
      before,
      after,
      note: "structure-only",
    });
  }
}

/* ── raw-text mode ─────────────────────────────────────────────────────── */

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function diffRawText(
  original: string,
  changed: string,
): {
  changes: YamlDiffChange[];
  summary: YamlDiffSummary;
  truncated: boolean;
} {
  const changes: YamlDiffChange[] = [];
  let added = 0;
  let removed = 0;
  let truncated = false;
  let originalLine = 1;
  let changedLine = 1;

  for (const part of diffLines(original, changed)) {
    const lines = splitLines(part.value);
    if (!part.added && !part.removed) {
      originalLine += lines.length;
      changedLine += lines.length;
      continue;
    }
    for (const line of lines) {
      const at = part.added ? `line ${changedLine}` : `line ${originalLine}`;
      if (part.added) {
        added += 1;
        changedLine += 1;
        if (changes.length < MAX_CHANGES)
          changes.push({ path: at, changeType: "added", after: line });
        else truncated = true;
      } else {
        removed += 1;
        originalLine += 1;
        if (changes.length < MAX_CHANGES)
          changes.push({ path: at, changeType: "removed", before: line });
        else truncated = true;
      }
    }
  }

  return {
    changes,
    summary: { added, removed, changed: 0, typeChanged: 0, structural: 0 },
    truncated,
  };
}

/* ── normalisation for the unified patch ───────────────────────────────── */

/** `*name` markers are not a YAML value; render them as the reference they are. */
function dumpable(value: unknown): unknown {
  if (value instanceof AliasRef) return `*${value.anchor}`;
  if (Array.isArray(value)) return value.map(dumpable);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) out[key] = dumpable(child);
    return out;
  }
  return value;
}

function normalize(values: readonly unknown[]): string {
  return values
    .map((raw) => {
      const value = dumpable(raw);
      try {
        return yaml.dump(value, { schema: SCHEMA, sortKeys: true, indent: 2, skipInvalid: true });
      } catch {
        return `${JSON.stringify(value, null, 2)}\n`;
      }
    })
    .join("---\n");
}

/* ── the tool ──────────────────────────────────────────────────────────── */

export const yamlDiffInputSchema = z.object({
  original: z
    .string()
    .min(1)
    .max(MAX_TEXT_CHARS)
    .describe("The original YAML (or JSON) document text; `---` streams allowed"),
  changed: z
    .string()
    .min(1)
    .max(MAX_TEXT_CHARS)
    .describe("The changed YAML (or JSON) document text; `---` streams allowed"),
  mode: z
    .enum(["semantic", "raw-text"])
    .describe(
      "semantic: compare parsed structure, ignoring key order/quoting/indentation. raw-text: line diff of the literal characters",
    )
    .default("semantic"),
  resolveAnchors: z
    .boolean()
    .describe(
      "Semantic mode only. true: expand aliases to their values before comparing. false: compare the unexpanded document, treating each `*alias` as its own value",
    )
    .default(true),
  matchSequencesBy: z
    .array(z.string().min(1).max(64))
    .max(8)
    .describe(
      "Candidate identity fields for sequences of mappings; the first one present and unique on both sides is used, otherwise items pair positionally",
    )
    .default([...DEFAULT_IDENTITY_FIELDS]),
});

export type YamlDiffInput = z.infer<typeof yamlDiffInputSchema>;

export function diffYaml(input: YamlDiffInput): YamlDiffOutput {
  const mode: YamlDiffMode = input.mode ?? "semantic";
  const identityFields = input.matchSequencesBy ?? [...DEFAULT_IDENTITY_FIELDS];
  const resolveAnchors = input.resolveAnchors ?? true;
  const notes: YamlDiffNote[] = [];

  if (mode === "raw-text") {
    const raw = diffRawText(input.original, input.changed);
    return {
      mode,
      equivalent: input.original === input.changed,
      parseErrors: {},
      documents: { original: 1, changed: 1 },
      summary: raw.summary,
      changes: raw.changes,
      truncated: raw.truncated,
      duplicateKeyWarnings: [],
      notes: [
        {
          code: "raw-text-mode",
          message:
            "Raw-text mode compares characters, not structure: key order, quoting and indentation all count as differences.",
        },
      ],
      unified: createTwoFilesPatch("original", "changed", input.original, input.changed, "", ""),
      engine: "nebutra-yaml-diff",
    };
  }

  const left = parseYaml(input.original);
  const right = parseYaml(input.changed);
  const parseErrors: { original?: YamlParseError; changed?: YamlParseError } = {};
  if (!left.ok) parseErrors.original = left.error;
  if (!right.ok) parseErrors.changed = right.error;
  if (!left.ok || !right.ok) {
    return {
      mode,
      equivalent: false,
      parseErrors,
      documents: {
        original: left.ok ? left.parsed.values.length : 0,
        changed: right.ok ? right.parsed.values.length : 0,
      },
      summary: { added: 0, removed: 0, changed: 0, typeChanged: 0, structural: 0 },
      changes: [],
      truncated: false,
      duplicateKeyWarnings: [],
      notes: [
        {
          code: "parse-error",
          message: "One side did not parse; nothing was compared.",
          detail: [
            parseErrors.original && `original: ${parseErrors.original.message}`,
            parseErrors.changed && `changed: ${parseErrors.changed.message}`,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      ],
      unified: "",
      engine: "nebutra-yaml-diff",
    };
  }

  const originalCount = left.parsed.values.length;
  const changedCount = right.parsed.values.length;
  const multiDoc = originalCount > 1 || changedCount > 1;

  const leftScan = scanAst(left.parsed.ast, multiDoc);
  const rightScan = scanAst(right.parsed.ast, multiDoc);

  const leftValues = resolveAnchors
    ? left.parsed.values
    : left.parsed.ast.map((doc) => (doc.contents ? astToValue(doc.contents) : null));
  const rightValues = resolveAnchors
    ? right.parsed.values
    : right.parsed.ast.map((doc) => (doc.contents ? astToValue(doc.contents) : null));

  const ctx: DiffContext = {
    changes: [],
    identityFields,
    identityUsed: new Set<string>(),
    valueChanged: new Set<string>(),
    identityAlias: new Map<string, string>(),
    reorderedSequences: new Set<string>(),
    summary: { added: 0, removed: 0, changed: 0, typeChanged: 0, structural: 0 },
    truncated: false,
  };

  const shared = Math.min(leftValues.length, rightValues.length);
  for (let i = 0; i < shared; i += 1) {
    diffValues(leftValues[i], rightValues[i], multiDoc ? `doc[${i}]` : "", ctx);
  }
  for (let i = shared; i < leftValues.length; i += 1) {
    push(ctx, {
      path: `doc[${i}]`,
      changeType: "removed",
      before: leftValues[i],
      beforeType: yamlTypeOf(leftValues[i]),
    });
  }
  for (let i = shared; i < rightValues.length; i += 1) {
    push(ctx, {
      path: `doc[${i}]`,
      changeType: "added",
      after: rightValues[i],
      afterType: yamlTypeOf(rightValues[i]),
    });
  }

  diffStructure(leftScan.structure, rightScan.structure, ctx);

  // Counted in `push`, so the totals stay complete even when MAX_CHANGES stops
  // the list — the summary is a fact about the documents, not about the page.
  const summary: YamlDiffSummary = { ...ctx.summary };

  if (originalCount !== changedCount) {
    notes.push({
      code: "document-count-mismatch",
      message:
        "The two sides hold a different number of `---` documents; documents were paired positionally and the extras are reported whole.",
      detail: `original: ${originalCount} · changed: ${changedCount}`,
    });
  }
  if (leftScan.usesMergeKeys || rightScan.usesMergeKeys) {
    notes.push({
      code: "merge-keys-expanded",
      message: resolveAnchors
        ? "Merge keys (`<<`) were expanded before comparing; a node's own keys win over merged ones."
        : "Merge keys (`<<`) were left unexpanded because resolveAnchors is off.",
    });
  }
  if (!resolveAnchors && (leftScan.usesAnchors || rightScan.usesAnchors)) {
    notes.push({
      code: "anchors-unresolved",
      message: "Aliases were compared as `*name` references, not as their resolved values.",
    });
  }
  const ambiguous = [...leftScan.ambiguousScalars, ...rightScan.ambiguousScalars];
  if (ambiguous.length > 0) {
    notes.push({
      code: "yaml11-ambiguous-scalars",
      message:
        "Unquoted y/n/yes/no/on/off read as strings under the YAML 1.2 Core Schema used here, and as booleans under YAML 1.1 — quote them if a boolean was meant.",
      detail: [...new Set(ambiguous)].slice(0, MAX_NAMED_PATHS).join(", "),
    });
  }
  if (ctx.identityUsed.size > 0) {
    notes.push({
      code: "sequence-matched-by-identity",
      message:
        "Sequences of mappings were paired by an identity field instead of by position; a reorder is still reported as `[order]`.",
      detail: [...ctx.identityUsed].join(", "),
    });
  }
  if (ctx.truncated) {
    notes.push({
      code: "truncated",
      message: `Only the first ${MAX_CHANGES} changes are listed; the summary counts are complete.`,
    });
  }

  const duplicateKeyWarnings: YamlDuplicateKeyWarning[] = [
    ...leftScan.duplicateKeys.map((path) => ({ document: "original" as const, path })),
    ...rightScan.duplicateKeys.map((path) => ({ document: "changed" as const, path })),
  ].map(({ document, path }) => ({
    document,
    path,
    message: "Duplicate mapping key in the source document; the last occurrence was used.",
  }));
  if (duplicateKeyWarnings.length > 0) {
    notes.push({
      code: "duplicate-keys",
      message:
        "A mapping in the input declares the same key twice. The YAML spec leaves this undefined and parsers disagree; the last occurrence was used here.",
    });
  }

  const behavioural = summary.added + summary.removed + summary.changed + summary.typeChanged;

  return {
    mode,
    equivalent: behavioural === 0,
    parseErrors,
    ...(originalCount === changedCount
      ? {}
      : { documentCountMismatch: { originalCount, changedCount } }),
    documents: { original: originalCount, changed: changedCount },
    summary,
    changes: ctx.changes,
    truncated: ctx.truncated,
    duplicateKeyWarnings,
    notes,
    unified: createTwoFilesPatch(
      "original.normalized.yaml",
      "changed.normalized.yaml",
      normalize(leftValues),
      normalize(rightValues),
      "",
      "",
    ),
    engine: "nebutra-yaml-diff",
  };
}

export const yamlDiffTool = tool({
  id: "data/yaml-diff",
  slug: "yaml-diff",
  category: "data",
  title: { zh: "YAML 差异对比", en: "YAML Diff" },
  description: {
    zh: "语义化对比两份 YAML/JSON：忽略键顺序与引号缩进噪声，展开锚点/别名与合并键，按身份字段匹配序列项，输出带路径与类型的结构化变更",
    en: "Semantic YAML/JSON comparison: key order, quoting and indentation ignored; anchors, aliases and merge keys expanded; sequences matched by identity field; structured path + change-type output",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.yaml_diff",
  roots: ["comparator"],
  engine: {
    name: "nebutra-yaml-diff",
    upstream:
      "YAML 1.2.2 §10.2 Core Schema · YAML 1.2.2 §7.1 alias nodes · §8.1.1.2 block chomping · tag:yaml.org,2002:merge · RFC 8259 (JSON) · js-yaml 5.x parser",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "yaml对比,yaml差异,比较两个yaml文件,kubernetes yaml diff,helm values 对比",
    en: "yaml diff, compare yaml files, yaml compare online, semantic yaml diff, kubernetes yaml diff, helm values diff",
  },
  inputSchema: yamlDiffInputSchema,
  execute: (input: YamlDiffInput) => diffYaml(input),
});

export const w3YamlDiffTools: readonly AnyForgeToolDefinition[] = [yamlDiffTool];
