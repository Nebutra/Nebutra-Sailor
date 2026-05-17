/**
 * Deterministic code chunker — the only place raw file text becomes
 * {@link CodeBlock}s for the content-addressed semantic index.
 *
 * ── Mental model ────────────────────────────────────────────────────────────
 * A file is reduced to a list of self-contained, indexable spans by exactly one
 * of three strategies, chosen by what we know about the file:
 *
 *   1. STRUCTURAL   — a {@link CodeParser} understood the language and handed
 *                     back a node tree. We walk it: a node that is "big enough"
 *                     becomes a block; a node that is "too big" is opened up
 *                     (recurse into children, or — if it is a childless leaf —
 *                     fall through to LINE on just that node's span).
 *   2. MARKDOWN     — the language is markdown and no parser tree exists. Split
 *                     on ATX headers; a heading + its body (up to the next
 *                     same-or-higher header) is one section block.
 *   3. LINE         — everything else (no parser, parser said "unsupported", or
 *                     the structural-leaf fallback). Greedily pack whole lines
 *                     up to {@link MAX_BLOCK_CHARS}, with a re-balancing pass so
 *                     the final chunk is never a starved sliver, and a
 *                     hard-split escape hatch for a single monstrous line.
 *
 * ── Invariants ──────────────────────────────────────────────────────────────
 *  • Pure & deterministic: no FS, network, clock, or randomness. The same
 *    (content, filePath, language, parser-tree) always yields byte-identical
 *    blocks — this is what makes upserts dedupe and incremental scans skip.
 *  • Immutable: inputs (including the caller's parser tree) are never mutated;
 *    every result is a freshly built `readonly CodeBlock[]`.
 *  • Content-addressed: every block carries `segmentHash` (path + span + length
 *    + prefix) and `fileHash` (the WHOLE file, identical across all blocks of a
 *    file) from {@link "./interfaces"} — never re-implemented here.
 *  • 1-based inclusive line numbers. Empty / whitespace-only input → `[]`.
 *  • `exactOptionalPropertyTypes` is on: `identifier` is always present on the
 *    object as `string | undefined`, never an absent property.
 *
 * ── Documented constants (part of the design contract) ──────────────────────
 *  • MIN_BLOCK_CHARS (50)            — a span shorter than this is too small to
 *                                      index on its own; structural nodes below
 *                                      it are skipped.
 *  • MAX_BLOCK_CHARS (1000)          — target ceiling for a single block.
 *  • OVERSIZE_TOLERANCE (1.15)       — slack before a structural node is forced
 *                                      open: only `len > MAX * 1.15` splits, so
 *                                      a slightly-over node stays whole.
 *  • MIN_CHUNK_REMAINDER_CHARS (200) — the re-balancing floor: a greedy cut is
 *                                      walked back so the trailing chunk has at
 *                                      least this many chars.
 */

import type { CodeBlock, CodeParser, ParsedNode } from "./interfaces";
import { fileHash, segmentHash } from "./interfaces";

/** A span shorter than this is too small to index as a standalone block. */
export const MIN_BLOCK_CHARS = 50;

/** Target maximum size, in characters, of a single emitted block. */
export const MAX_BLOCK_CHARS = 1000;

/**
 * Slack multiplier applied to {@link MAX_BLOCK_CHARS} before a structural node
 * is forced open. A node is only split when `len > MAX * OVERSIZE_TOLERANCE`.
 */
export const OVERSIZE_TOLERANCE = 1.15;

/**
 * Re-balancing floor: after a greedy line cut, if the trailing remainder would
 * be smaller than this, the split index is walked back so the last chunk is not
 * a starved sliver.
 */
export const MIN_CHUNK_REMAINDER_CHARS = 200;

/** Hard ceiling once a node is judged "too big" to keep whole. */
const OVERSIZE_LIMIT = MAX_BLOCK_CHARS * OVERSIZE_TOLERANCE;

/** ATX markdown header: 1–6 leading `#`, a space, then the heading text. */
const ATX_HEADER_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Inputs to {@link chunkCode}. */
export interface ChunkCodeArgs {
  readonly content: string;
  readonly filePath: string;
  readonly language: string;
  readonly parser?: CodeParser | undefined;
}

/**
 * Reduce one file to its indexable {@link CodeBlock}s. See the module header
 * for the strategy-selection rules and invariants.
 */
export function chunkCode(args: ChunkCodeArgs): readonly CodeBlock[] {
  const { content, filePath, language, parser } = args;

  if (content.trim().length === 0) return [];

  const lines = content.split("\n");
  const whole = fileHash(content);
  const ctx: ChunkContext = { filePath, lines, fileHash: whole };

  const tree = parser?.parse(content, language);
  if (tree !== undefined) {
    return finalize(structuralWalk(tree, ctx), ctx);
  }

  if (isMarkdown(language)) {
    return finalize(markdownChunk(ctx), ctx);
  }

  return finalize(lineChunk(1, lines.length, "code", undefined, ctx), ctx);
}

// ─── Internal model ─────────────────────────────────────────────────────────

interface ChunkContext {
  readonly filePath: string;
  /** The whole file split on "\n" (1-based logical line N === `lines[N-1]`). */
  readonly lines: readonly string[];
  readonly fileHash: string;
}

/**
 * An emitted block before it is content-addressed. Kept separate so the hashing
 * step is the single place {@link segmentHash} is applied.
 */
interface DraftBlock {
  readonly identifier: string | undefined;
  readonly type: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly content: string;
}

/** Slice the 1-based inclusive line span `[start, end]` back into text. */
function spanText(lines: readonly string[], start: number, end: number): string {
  return lines.slice(start - 1, end).join("\n");
}

/** Stamp a draft with its content-addressed identity. */
function seal(draft: DraftBlock, ctx: ChunkContext): CodeBlock {
  return {
    filePath: ctx.filePath,
    identifier: draft.identifier,
    type: draft.type,
    startLine: draft.startLine,
    endLine: draft.endLine,
    content: draft.content,
    segmentHash: segmentHash({
      filePath: ctx.filePath,
      startLine: draft.startLine,
      endLine: draft.endLine,
      content: draft.content,
    }),
    fileHash: ctx.fileHash,
  };
}

function finalize(drafts: readonly DraftBlock[], ctx: ChunkContext): readonly CodeBlock[] {
  // Content-address each draft from its own span (immutability: a fresh array,
  // no mutation of the drafts or the context).
  return drafts.map((d) => seal(d, ctx));
}

// ─── Structural strategy ────────────────────────────────────────────────────

function structuralWalk(nodes: readonly ParsedNode[], ctx: ChunkContext): readonly DraftBlock[] {
  const out: DraftBlock[] = [];
  for (const n of nodes) {
    out.push(...structuralNode(n, ctx));
  }
  return out;
}

function structuralNode(n: ParsedNode, ctx: ChunkContext): readonly DraftBlock[] {
  const text = spanText(ctx.lines, n.startLine, n.endLine);
  const len = text.length;

  // Too small to stand alone as an indexed unit.
  if (len < MIN_BLOCK_CHARS) return [];

  // Comfortably sized → one block, keep structural metadata.
  if (len <= OVERSIZE_LIMIT) {
    return [
      {
        identifier: n.identifier,
        type: n.type,
        startLine: n.startLine,
        endLine: n.endLine,
        content: text,
      },
    ];
  }

  // Oversize: open it up. Prefer recursing into children…
  if (n.children.length > 0) {
    const out: DraftBlock[] = [];
    for (const child of n.children) {
      out.push(...structuralNode(child, ctx));
    }
    return out;
  }

  // …otherwise it is a childless leaf — degrade to line-chunking its own span,
  // carrying the node's structural type as the line-chunk base type.
  return lineChunk(n.startLine, n.endLine, n.type, n.identifier, ctx);
}

// ─── Line strategy ──────────────────────────────────────────────────────────

/**
 * Greedily pack whole lines from `[startLine, endLine]` up to
 * {@link MAX_BLOCK_CHARS}, re-balancing the final cut so the trailing chunk is
 * not starved, and hard-splitting any single line that alone exceeds the max.
 */
function lineChunk(
  startLine: number,
  endLine: number,
  baseType: string,
  identifier: string | undefined,
  ctx: ChunkContext,
): readonly DraftBlock[] {
  const out: DraftBlock[] = [];
  let cursor = startLine;

  while (cursor <= endLine) {
    const line = ctx.lines[cursor - 1] ?? "";

    // A single line larger than the ceiling cannot be packed — hard-split it
    // into fixed-size pieces, each its own `${baseType}_segment` block.
    if (line.length > MAX_BLOCK_CHARS) {
      out.push(...hardSplitLine(cursor, line, baseType, identifier, ctx));
      cursor += 1;
      continue;
    }

    // Grow the window greedily; stop before adding a line would overflow.
    let last = cursor;
    let size = line.length;
    while (last + 1 <= endLine) {
      const next = ctx.lines[last] ?? "";
      if (next.length > MAX_BLOCK_CHARS) break; // handled on its own pass
      const grown = size + 1 + next.length; // +1 for the rejoined "\n"
      if (grown > MAX_BLOCK_CHARS) break;
      size = grown;
      last += 1;
    }

    // Re-balancing pass: if a remainder would follow but be too small to be a
    // useful standalone chunk, pull lines back into it (so neither this chunk
    // nor the tail is starved). Never back-track past the chunk start.
    if (last < endLine) {
      let remainderChars = spanText(ctx.lines, last + 1, endLine).length;
      while (
        remainderChars < MIN_CHUNK_REMAINDER_CHARS &&
        last > cursor &&
        (ctx.lines[last - 1] ?? "").length <= MAX_BLOCK_CHARS
      ) {
        last -= 1;
        remainderChars = spanText(ctx.lines, last + 1, endLine).length;
      }
    }

    out.push({
      identifier,
      type: baseType,
      startLine: cursor,
      endLine: last,
      content: spanText(ctx.lines, cursor, last),
    });
    cursor = last + 1;
  }

  return out;
}

/**
 * Split one over-long physical line into fixed `MAX_BLOCK_CHARS`-sized pieces.
 * Concatenating the pieces' `content` reproduces the original line exactly.
 */
function hardSplitLine(
  lineNo: number,
  line: string,
  baseType: string,
  identifier: string | undefined,
  _ctx: ChunkContext,
): readonly DraftBlock[] {
  const out: DraftBlock[] = [];
  for (let i = 0; i < line.length; i += MAX_BLOCK_CHARS) {
    out.push({
      identifier,
      type: `${baseType}_segment`,
      startLine: lineNo,
      endLine: lineNo,
      content: line.slice(i, i + MAX_BLOCK_CHARS),
    });
  }
  return out;
}

// ─── Markdown strategy ──────────────────────────────────────────────────────

function isMarkdown(language: string): boolean {
  const l = language.toLowerCase();
  return l === "markdown" || l === "md" || l === "mdx";
}

interface MdSection {
  readonly identifier: string;
  readonly startLine: number;
  readonly endLine: number;
}

/**
 * Header-aware split: each ATX heading opens a section that runs until the next
 * header of the same or higher level (lower or equal `#` count). Text before
 * the first header, if any, becomes a leading untitled section.
 */
function markdownChunk(ctx: ChunkContext): readonly DraftBlock[] {
  const headers: { line: number; level: number; text: string }[] = [];
  ctx.lines.forEach((raw, idx) => {
    const m = ATX_HEADER_RE.exec(raw);
    if (m) {
      headers.push({ line: idx + 1, level: m[1]!.length, text: m[2]!.trim() });
    }
  });

  if (headers.length === 0) {
    // No headings at all — treat the whole document as a single line-chunked
    // markdown body so we still index it.
    return lineChunk(1, ctx.lines.length, "markdown_section", undefined, ctx);
  }

  const sections: MdSection[] = [];

  // Preamble before the first header.
  if (headers[0]!.line > 1) {
    sections.push({
      identifier: "",
      startLine: 1,
      endLine: headers[0]!.line - 1,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!;
    // Section ends just before the next header at the same-or-higher level.
    let end = ctx.lines.length;
    for (let j = i + 1; j < headers.length; j++) {
      if (headers[j]!.level <= h.level) {
        end = headers[j]!.line - 1;
        break;
      }
    }
    sections.push({ identifier: h.text, startLine: h.line, endLine: end });
  }

  const out: DraftBlock[] = [];
  for (const s of sections) {
    const text = spanText(ctx.lines, s.startLine, s.endLine);
    if (text.trim().length === 0) continue;

    if (text.length <= MAX_BLOCK_CHARS) {
      out.push({
        identifier: s.identifier === "" ? undefined : s.identifier,
        type: "markdown_section",
        startLine: s.startLine,
        endLine: s.endLine,
        content: text,
      });
      continue;
    }

    // Over-long section → line-chunk it internally as *_segment blocks.
    for (const piece of lineChunk(
      s.startLine,
      s.endLine,
      "markdown_section",
      s.identifier === "" ? undefined : s.identifier,
      ctx,
    )) {
      out.push({
        ...piece,
        type: "markdown_section_segment",
      });
    }
  }

  return out;
}
