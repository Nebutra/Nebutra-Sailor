// =============================================================================
// @nebutra/knowledge-rag — Recursive character chunker
// =============================================================================
// Splits text by trying progressively finer separators (paragraph → line →
// sentence → word → char), packing into windows of <= `size` with `overlap`
// carried between consecutive chunks. Pure and deterministic.
// =============================================================================

import { KnowledgeRagError } from "./errors";
import type { Chunker } from "./types";

export interface RecursiveCharChunkerOptions {
  /** Maximum chunk length in characters. */
  size: number;
  /** Characters of overlap carried from the end of one chunk to the next. */
  overlap: number;
  /** Separators tried in order, coarsest first. */
  separators?: string[];
}

const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

export class RecursiveCharChunker implements Chunker {
  private readonly size: number;
  private readonly overlap: number;
  private readonly separators: string[];

  constructor(options: RecursiveCharChunkerOptions) {
    const { size, overlap } = options;
    if (!Number.isFinite(size) || size <= 0) {
      throw new KnowledgeRagError(`Invalid chunker size: ${size}`, {
        code: "E_CHUNKER_CONFIG",
        suggestion: "Pass a positive integer `size` (e.g. { size: 800, overlap: 100 }).",
      });
    }
    if (overlap < 0 || overlap >= size) {
      throw new KnowledgeRagError(
        `Invalid chunker overlap: ${overlap} (must be >= 0 and < size ${size})`,
        {
          code: "E_CHUNKER_CONFIG",
          suggestion: `Set overlap to a value in [0, ${size - 1}] — typically ~10-15% of size.`,
        },
      );
    }
    this.size = size;
    this.overlap = overlap;
    this.separators = options.separators ?? DEFAULT_SEPARATORS;
  }

  split(text: string): string[] {
    if (text.trim().length === 0) {
      return [];
    }
    const pieces = this.recursiveSplit(text, 0);
    // Pieces are each <= size. If any single piece exceeds the effective
    // step (size - overlap) we still pack greedily; the overlap is applied as
    // a prefix carried into the *next* chunk.
    return this.mergeWithOverlap(pieces);
  }

  /** Break text into atomic pieces each <= size, preferring coarse separators. */
  private recursiveSplit(text: string, sepIndex: number): string[] {
    if (text.length <= this.size) {
      return text.length > 0 ? [text] : [];
    }
    const sep = this.separators[sepIndex] ?? "";
    if (sep === "") {
      // Hard character split as a last resort. Window the step at
      // (size - overlap) so an overlap prefix can always be prepended later
      // without exceeding `size`.
      const step = Math.max(1, this.size - this.overlap);
      const out: string[] = [];
      for (let i = 0; i < text.length; i += step) {
        out.push(text.slice(i, i + step));
      }
      return out;
    }
    const parts = text.split(sep);
    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const withSep = i < parts.length - 1 ? parts[i]! + sep : parts[i]!;
      if (withSep.length === 0) continue;
      if (withSep.length <= this.size) {
        out.push(withSep);
      } else {
        out.push(...this.recursiveSplit(withSep, sepIndex + 1));
      }
    }
    return out;
  }

  /** Pack atomic pieces into <= size windows, carrying `overlap` chars over. */
  private mergeWithOverlap(pieces: string[]): string[] {
    const chunks: string[] = [];
    let current = "";
    for (const piece of pieces) {
      if (current.length + piece.length <= this.size) {
        current += piece;
        continue;
      }
      if (current.length > 0) {
        chunks.push(current);
        current = this.overlap > 0 ? current.slice(-this.overlap) : "";
      }
      if (piece.length <= this.size) {
        current += piece;
      } else {
        // Oversized atomic piece — emit fixed windows directly.
        for (let i = 0; i < piece.length; i += this.size) {
          chunks.push(piece.slice(i, i + this.size));
        }
        current = "";
      }
    }
    if (current.trim().length > 0) {
      chunks.push(current);
    }
    return chunks;
  }
}
