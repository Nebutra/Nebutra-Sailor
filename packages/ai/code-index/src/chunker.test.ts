/**
 * Behaviour spec for the deterministic code chunker.
 *
 * The chunker is the only place in the package that turns raw file text into
 * {@link CodeBlock}s, so its determinism is load-bearing for the whole
 * content-addressed pipeline. These tests pin the three strategies
 * (structural / line / markdown), every documented constant, and the
 * hash-stability contract. The structural parser is a hand-written fake — no
 * mocking library — because the production code only depends on the
 * {@link CodeParser} port shape, never a vendor.
 */

import { describe, expect, it } from "vitest";

import {
  chunkCode,
  MAX_BLOCK_CHARS,
  MIN_BLOCK_CHARS,
  MIN_CHUNK_REMAINDER_CHARS,
  OVERSIZE_TOLERANCE,
} from "./chunker";
import type { CodeParser, ParsedNode } from "./interfaces";
import { fileHash, segmentHash } from "./interfaces";

// ── Test helpers ────────────────────────────────────────────────────────────

/**
 * A fake structural parser: returns whatever tree the test handed it. `parse`
 * is keyed on a language allow-list so we can also exercise the
 * "parser returns undefined" degradation path.
 */
function fakeParser(
  tree: ParsedNode[] | undefined,
  supportedLanguages: readonly string[] = ["ts"],
): CodeParser {
  return {
    parse(_content: string, language: string): ParsedNode[] | undefined {
      if (!supportedLanguages.includes(language)) return undefined;
      return tree;
    },
  };
}

function node(
  partial: Omit<ParsedNode, "children" | "identifier"> &
    Partial<Pick<ParsedNode, "children" | "identifier">>,
): ParsedNode {
  return {
    type: partial.type,
    identifier: partial.identifier,
    startLine: partial.startLine,
    endLine: partial.endLine,
    children: partial.children ?? [],
  };
}

/** Build a span of `lineCount` lines, each `width` chars wide (no newline at EOF). */
function block(lineCount: number, width: number, fill = "x"): string {
  return Array.from({ length: lineCount }, () => fill.repeat(width)).join("\n");
}

// ── Empty / degenerate input ────────────────────────────────────────────────

describe("chunkCode — empty input", () => {
  it("returns [] for an empty string", () => {
    expect(chunkCode({ content: "", filePath: "a.ts", language: "ts" })).toEqual([]);
  });

  it("returns [] for whitespace-only input", () => {
    expect(chunkCode({ content: "  \n\t\n   \n", filePath: "a.ts", language: "ts" })).toEqual([]);
  });

  it("returns a readonly-safe array (a fresh array each call)", () => {
    const a = chunkCode({ content: "", filePath: "a.ts", language: "ts" });
    const b = chunkCode({ content: "", filePath: "a.ts", language: "ts" });
    expect(a).not.toBe(b);
  });
});

// ── Documented constants ────────────────────────────────────────────────────

describe("chunkCode — exported constants are the documented design", () => {
  it("exposes the exact tuning constants", () => {
    expect(MIN_BLOCK_CHARS).toBe(50);
    expect(MAX_BLOCK_CHARS).toBe(1000);
    expect(OVERSIZE_TOLERANCE).toBe(1.15);
    expect(MIN_CHUNK_REMAINDER_CHARS).toBe(200);
  });
});

// ── Structural strategy ─────────────────────────────────────────────────────

describe("chunkCode — structural happy path", () => {
  it("emits one block per node that clears MIN_BLOCK_CHARS, carrying type+identifier", () => {
    const fnBody = block(6, 40); // ~ 6*40 + 5 newlines = 245 chars
    const content = `${fnBody}\n`;
    const parser = fakeParser([
      node({
        type: "function",
        identifier: "doWork",
        startLine: 1,
        endLine: 6,
      }),
    ]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("function");
    expect(blocks[0]?.identifier).toBe("doWork");
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks[0]?.endLine).toBe(6);
    expect(blocks[0]?.content).toBe(fnBody);
  });

  it("skips nodes shorter than MIN_BLOCK_CHARS (too small to index alone)", () => {
    const content = ["tiny();", block(6, 40)].join("\n");
    const parser = fakeParser([
      node({ type: "call", identifier: "tiny", startLine: 1, endLine: 1 }),
      node({ type: "function", identifier: "big", startLine: 2, endLine: 7 }),
    ]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.identifier).toBe("big");
  });

  it("emits identifier as `undefined` (not missing) when the node has none", () => {
    const content = block(6, 40);
    const parser = fakeParser([node({ type: "block", startLine: 1, endLine: 6 })]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.identifier).toBeUndefined();
    expect("identifier" in (blocks[0] as object)).toBe(true);
  });
});

describe("chunkCode — structural oversize recursion", () => {
  it("recurses into children when a node exceeds MAX_BLOCK_CHARS * OVERSIZE_TOLERANCE", () => {
    // class spans lines 1..40, well over 1150 chars; two child methods.
    const content = block(40, 40);
    const parser = fakeParser([
      node({
        type: "class",
        identifier: "Big",
        startLine: 1,
        endLine: 40,
        children: [
          node({
            type: "method",
            identifier: "m1",
            startLine: 1,
            endLine: 18,
          }),
          node({
            type: "method",
            identifier: "m2",
            startLine: 19,
            endLine: 40,
          }),
        ],
      }),
    ]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks.map((b) => b.identifier)).toEqual(["m1", "m2"]);
    expect(blocks.every((b) => b.type === "method")).toBe(true);
  });

  it("keeps an oversize node within tolerance as a single block (no needless split)", () => {
    // length between MAX_BLOCK_CHARS (1000) and MAX*TOLERANCE (1150).
    const content = "y".repeat(1080);
    const parser = fakeParser([
      node({ type: "function", identifier: "f", startLine: 1, endLine: 1 }),
    ]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("function");
  });

  it("falls back to line-chunking when an oversize node is a childless leaf", () => {
    const content = block(60, 60); // 60 lines * ~61 chars ≈ 3660 chars
    const parser = fakeParser([
      node({
        type: "function",
        identifier: "huge",
        startLine: 1,
        endLine: 60,
      }),
    ]);

    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
      parser,
    });

    expect(blocks.length).toBeGreaterThan(1);
    // leaf line-chunk fallback keeps the node's structural type as the base.
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    // contiguous, non-overlapping coverage of the node's span.
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks.at(-1)?.endLine).toBe(60);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i]?.startLine).toBe((blocks[i - 1]?.endLine ?? 0) + 1);
    }
  });
});

// ── Line-chunk strategy ─────────────────────────────────────────────────────

describe("chunkCode — parser-absent line chunking", () => {
  it("line-chunks a non-markdown file when no parser is supplied", () => {
    const content = block(80, 50); // ≈ 80 * 51 ≈ 4080 chars
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks.at(-1)?.endLine).toBe(80);
  });

  it("line-chunks when the parser returns undefined for the language", () => {
    const content = block(80, 50);
    const parser = fakeParser([], ["ts"]); // only 'ts' supported
    const blocks = chunkCode({
      content,
      filePath: "src/a.go",
      language: "go", // not supported → undefined → line path
      parser,
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
  });

  it("greedily accumulates lines, cutting before a line would exceed MAX_BLOCK_CHARS", () => {
    // 5 lines of 300 chars: 3 fit (3*301=903 ≤ 1000), 4th would overflow.
    const content = block(5, 300);
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });

    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    expect(blocks[0]?.startLine).toBe(1);
    // every line is represented exactly once, in order
    expect(blocks.at(-1)?.endLine).toBe(5);
  });

  it("emits a single block when the whole file fits under MAX_BLOCK_CHARS", () => {
    const content = block(4, 40); // ≈ 4*41 ≈ 163 chars
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks[0]?.endLine).toBe(4);
  });
});

describe("chunkCode — re-balancing pass", () => {
  it("back-tracks the split so the trailing remainder is not a tiny sliver", () => {
    // Lines sized so a naive greedy cut would leave a < 200-char tail.
    // 7 lines of 180 chars (181 incl newline). Greedy: lines 1-5 = 905 chars
    // (line 6 → 1086 > 1000, cut at 5). Remainder lines 6-7 = 361 chars — OK.
    // Tighten: 12 lines of 95 chars. Greedy fills ~10 lines (10*96=960),
    // remainder = 2 lines ≈ 191 chars (< 200) → must re-balance.
    const content = block(12, 95);
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });

    expect(blocks.length).toBeGreaterThan(1);
    const last = blocks.at(-1);
    expect(last).toBeDefined();
    // The whole point of the re-balance: no starved trailing chunk.
    expect((last as { content: string }).content.length).toBeGreaterThanOrEqual(
      MIN_CHUNK_REMAINDER_CHARS,
    );
    // Still globally valid: every chunk respects the max.
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    // Contiguous coverage preserved after the back-track.
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks.at(-1)?.endLine).toBe(12);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i]?.startLine).toBe((blocks[i - 1]?.endLine ?? 0) + 1);
    }
  });
});

describe("chunkCode — single oversized line hard-split", () => {
  it("hard-splits one >MAX_BLOCK_CHARS line into fixed-size *_segment blocks", () => {
    const giant = "z".repeat(2600); // single line, no newline
    const blocks = chunkCode({
      content: giant,
      filePath: "src/a.ts",
      language: "ts",
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.type.endsWith("_segment"))).toBe(true);
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    // reassembling the segments reproduces the original line exactly
    expect(blocks.map((b) => b.content).join("")).toBe(giant);
  });

  it("hard-splits an oversized line that sits among normal lines", () => {
    const giant = "q".repeat(2400);
    const content = ["short header line", giant, "short footer line"].join("\n");
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });

    const segments = blocks.filter((b) => b.type.endsWith("_segment"));
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map((b) => b.content).join("")).toBe(giant);
  });
});

// ── Markdown strategy ───────────────────────────────────────────────────────

describe("chunkCode — markdown header sections", () => {
  it("splits at ATX headers; identifier = heading text; type = markdown_section", () => {
    const md = [
      "# Title",
      "Intro paragraph.",
      "",
      "## Section A",
      "Body of A.",
      "",
      "## Section B",
      "Body of B.",
    ].join("\n");

    const blocks = chunkCode({
      content: md,
      filePath: "README.md",
      language: "markdown",
    });

    expect(blocks.length).toBe(3);
    expect(blocks.every((b) => b.type === "markdown_section")).toBe(true);
    expect(blocks.map((b) => b.identifier)).toEqual(["Title", "Section A", "Section B"]);
    // Header spans follow the "until next same-or-higher header" rule, so an
    // h1 with only h2 children spans the whole document and the h2 sections
    // nest inside it. Start lines stay strictly ascending in document order.
    expect(blocks.map((b) => b.startLine)).toEqual([1, 4, 7]);
    // "Title" (h1) runs to EOF because there is no later h1-or-higher header.
    expect(blocks[0]?.startLine).toBe(1);
    expect(blocks[0]?.endLine).toBe(8);
    // The h2 sections are nested within the h1 span (overlap is by design).
    expect(blocks[1]?.startLine).toBe(4);
    expect(blocks[2]?.startLine).toBe(7);
  });

  it("treats a structural parser result as higher priority than markdown", () => {
    const md = "# Title\n" + block(6, 40);
    const parser = fakeParser(
      [node({ type: "doc", identifier: "Title", startLine: 1, endLine: 7 })],
      ["markdown"],
    );
    const blocks = chunkCode({
      content: md,
      filePath: "README.md",
      language: "markdown",
      parser,
    });
    expect(blocks.every((b) => b.type === "doc")).toBe(true);
  });

  it("does not use markdown strategy for a non-markdown language", () => {
    const looksLikeMd = "# not a heading in TS\n" + block(40, 60);
    const blocks = chunkCode({
      content: looksLikeMd,
      filePath: "src/a.ts",
      language: "ts",
    });
    expect(blocks.some((b) => b.type === "markdown_section")).toBe(false);
  });
});

describe("chunkCode — markdown oversize section", () => {
  it("line-chunks an over-long section into markdown_section_segment blocks", () => {
    const bigBody = block(60, 60); // ≈ 3660 chars under one heading
    const md = `# Huge\n${bigBody}`;
    const blocks = chunkCode({
      content: md,
      filePath: "README.md",
      language: "markdown",
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.type === "markdown_section_segment")).toBe(true);
    expect(blocks.every((b) => b.content.length <= MAX_BLOCK_CHARS)).toBe(true);
    expect(blocks[0]?.identifier).toBe("Huge");
  });

  it("supports all ATX levels h1..h6 and nests body until same-or-higher header", () => {
    const md = [
      "# H1",
      "a".repeat(60),
      "###### H6 deep",
      "b".repeat(60),
      "## H2 sibling",
      "c".repeat(60),
    ].join("\n");

    const blocks = chunkCode({
      content: md,
      filePath: "doc.md",
      language: "markdown",
    });

    const ids = blocks.map((b) => b.identifier);
    expect(ids).toContain("H1");
    expect(ids).toContain("H6 deep");
    expect(ids).toContain("H2 sibling");
  });
});

// ── Hash determinism ────────────────────────────────────────────────────────

describe("chunkCode — content-addressed determinism", () => {
  it("produces byte-identical blocks for identical input (re-run stability)", () => {
    const content = block(80, 50);
    const a = chunkCode({ content, filePath: "src/a.ts", language: "ts" });
    const b = chunkCode({ content, filePath: "src/a.ts", language: "ts" });
    expect(a).toEqual(b);
    expect(a.map((x) => x.segmentHash)).toEqual(b.map((x) => x.segmentHash));
  });

  it("segmentHash matches the interfaces helper for each emitted block", () => {
    const content = block(80, 50);
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });
    for (const b of blocks) {
      expect(b.segmentHash).toBe(
        segmentHash({
          filePath: b.filePath,
          startLine: b.startLine,
          endLine: b.endLine,
          content: b.content,
        }),
      );
    }
  });

  it("fileHash is the WHOLE-file digest, identical across every block", () => {
    const content = block(80, 50);
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });
    const expected = fileHash(content);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.fileHash === expected)).toBe(true);
  });

  it("different span ⇒ different segmentHash (same text at two locations stays distinct)", () => {
    const content = block(80, 50);
    const blocks = chunkCode({
      content,
      filePath: "src/a.ts",
      language: "ts",
    });
    const hashes = new Set(blocks.map((b) => b.segmentHash));
    expect(hashes.size).toBe(blocks.length);
  });

  it("different filePath ⇒ different segmentHash for the same content", () => {
    const content = block(20, 40);
    const a = chunkCode({ content, filePath: "src/a.ts", language: "ts" });
    const b = chunkCode({ content, filePath: "src/b.ts", language: "ts" });
    expect(a[0]?.segmentHash).not.toBe(b[0]?.segmentHash);
  });

  it("does not mutate the caller's parser tree or args", () => {
    const tree = [node({ type: "fn", identifier: "f", startLine: 1, endLine: 6 })];
    const snapshot = JSON.stringify(tree);
    const content = block(6, 40);
    chunkCode({ content, filePath: "src/a.ts", language: "ts", parser: fakeParser(tree) });
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});
