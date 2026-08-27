import { describe, expect, it } from "vitest";
import { RecursiveCharChunker } from "./chunker";

describe("RecursiveCharChunker", () => {
  it("returns a single chunk when text fits in size", () => {
    const c = new RecursiveCharChunker({ size: 100, overlap: 10 });
    expect(c.split("hello world")).toEqual(["hello world"]);
  });

  it("respects max chunk size", () => {
    const c = new RecursiveCharChunker({ size: 20, overlap: 0 });
    const text = "a".repeat(95);
    const chunks = c.split(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const ch of chunks) {
      expect(ch.length).toBeLessThanOrEqual(20);
    }
  });

  it("produces overlap between consecutive chunks", () => {
    const c = new RecursiveCharChunker({ size: 10, overlap: 4 });
    const chunks = c.split("abcdefghijklmnopqrstuvwxyz");
    expect(chunks.length).toBeGreaterThan(1);
    // tail of chunk[0] equals head of chunk[1] for `overlap` chars
    const tail = chunks[0]!.slice(-4);
    expect(chunks[1]!.startsWith(tail)).toBe(true);
  });

  it("prefers splitting on paragraph/sentence boundaries", () => {
    const c = new RecursiveCharChunker({ size: 30, overlap: 0 });
    const text = "First sentence here.\n\nSecond paragraph follows nicely.";
    const chunks = c.split(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain("First sentence here.");
  });

  it("reconstructs full text when overlap is 0 (no data loss)", () => {
    const c = new RecursiveCharChunker({ size: 8, overlap: 0 });
    const text = "abcdefghijklmnop";
    expect(c.split(text).join("")).toBe(text);
  });

  it("rejects invalid config with a fix suggestion", () => {
    expect(() => new RecursiveCharChunker({ size: 10, overlap: 10 })).toThrowError(/overlap/i);
  });

  it("handles empty / whitespace text", () => {
    const c = new RecursiveCharChunker({ size: 10, overlap: 2 });
    expect(c.split("   ")).toEqual([]);
    expect(c.split("")).toEqual([]);
  });
});
