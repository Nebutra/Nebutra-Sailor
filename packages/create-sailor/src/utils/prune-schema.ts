/**
 * prune-schema.ts
 *
 * Parses `/// @conditional(flag=values)` annotations in a Prisma schema and
 * trims model blocks that don't match a given CLI flag selection.
 *
 * Annotation convention (LOCKED):
 *
 *   /// @conditional(flag=values)
 *   model Name {
 *     ...
 *   }
 *
 * Where:
 *   - `flag` is one of: auth, payment, billing-mode, idp, template, community
 *   - `values` is a `|`-separated list (pipe-OR)
 *   - Keep the model iff the caller's selection for `flag` is included in `values`.
 *   - Unannotated models/blocks are always kept.
 *
 * Uses the official `@mrleebo/prisma-ast` parser for robust, whitespace-tolerant
 * parsing of multi-line models, triple-slash comments, enums, and attributes.
 */

import { type Block, getSchema, printSchema, type Schema } from "@mrleebo/prisma-ast";

export interface ConditionalAnnotation {
  /** Model name (e.g. "AuthUser") */
  name: string;
  /** Annotation flag (e.g. "auth", "payment") */
  flag: string;
  /** Accepted values (e.g. ["wechat", "alipay"]) */
  values: string[];
}

export interface FlagSelection {
  [flag: string]: string | undefined;
}

/**
 * Matches `/// @conditional(flag=v1|v2|...)` (with optional leading whitespace
 * inside the comment body). The comment `text` surfaced by prisma-ast already
 * includes the `///` prefix.
 */
const CONDITIONAL_RE = /^\/\/\/\s*@conditional\(([A-Za-z][A-Za-z0-9_-]*)=([^)]+)\)\s*$/;

/** Is this block a triple-slash `/// ...` doc comment? */
function isTripleSlashComment(block: Block): boolean {
  return block.type === "comment" && block.text.trim().startsWith("///");
}

interface ParsedConditional {
  flag: string;
  values: string[];
}

/** Parse a `/// @conditional(...)` comment text into flag+values, or null. */
function parseConditionalText(text: string): ParsedConditional | null {
  const match = CONDITIONAL_RE.exec(text.trim());
  if (!match) return null;
  const [, flag, valuesRaw] = match;
  const values = valuesRaw
    .split("|")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return { flag, values };
}

/**
 * Find the conditional annotation that precedes a model block, if any.
 * Looks backwards through immediately preceding comment blocks (skipping
 * nothing — triple-slash comments for a model appear contiguously before it
 * in prisma-ast's block list).
 */
function findPrecedingConditional(
  blocks: Block[],
  modelIndex: number,
): { annIndex: number; parsed: ParsedConditional } | null {
  for (let i = modelIndex - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block.type === "comment") {
      const parsed = parseConditionalText(block.text);
      if (parsed) return { annIndex: i, parsed };
      continue;
    }
    break;
  }
  return null;
}

export function parseConditionalAnnotations(schemaSource: string): ConditionalAnnotation[] {
  const schema = getSchema(schemaSource);
  const out: ConditionalAnnotation[] = [];
  for (let i = 0; i < schema.list.length; i++) {
    const block = schema.list[i];
    if (block.type !== "model") continue;
    const hit = findPrecedingConditional(schema.list, i);
    if (!hit) continue;
    out.push({ name: block.name, flag: hit.parsed.flag, values: hit.parsed.values });
  }
  return out;
}

/**
 * Prune the schema by removing `@conditional` model blocks whose flag/value
 * does not match the given selection. Keeps everything else untouched.
 *
 * Behavior:
 *   - Unannotated models: always kept.
 *   - Annotated model matching selection: kept, but its `/// @conditional(...)`
 *     comment is stripped (other `///` doc comments on the model are preserved).
 *   - Annotated model NOT matching selection: removed together with its
 *     `@conditional` comment. Other `///` doc comments attached only to that
 *     model are also removed.
 */
export function pruneSchemaByFlags(schemaSource: string, flags: FlagSelection): string {
  const schema = getSchema(schemaSource);

  const dropIndices = new Set<number>();

  for (let i = 0; i < schema.list.length; i++) {
    const block = schema.list[i];
    if (block.type !== "model") continue;

    const hit = findPrecedingConditional(schema.list, i);
    if (!hit) continue;

    const selected = flags[hit.parsed.flag];
    const shouldKeep = selected !== undefined && hit.parsed.values.includes(selected);

    if (shouldKeep) {
      dropIndices.add(hit.annIndex);
    } else {
      dropIndices.add(i);
      for (let j = i - 1; j >= 0; j--) {
        const commentBlock = schema.list[j];
        if (commentBlock.type === "comment" && isTripleSlashComment(commentBlock)) {
          dropIndices.add(j);
          continue;
        }
        break;
      }
      const next = schema.list[i + 1];
      if (next && next.type === "break") {
        dropIndices.add(i + 1);
      }
    }
  }

  const keptList: Block[] = schema.list.filter((_, idx) => !dropIndices.has(idx));

  const compacted: Block[] = [];
  for (const block of keptList) {
    const last = compacted[compacted.length - 1];
    if (block.type === "break" && last && last.type === "break") continue;
    compacted.push(block);
  }

  const pruned: Schema = { type: "schema", list: compacted };
  return printSchema(pruned);
}
