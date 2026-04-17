import { describe, expect, it } from "vitest";
import { countTokens, estimateUsage } from "../tiktoken-fallback.js";

describe("countTokens", () => {
  it("returns a reasonable positive integer for plain text on gpt-4o", () => {
    const count = countTokens("hello world", "gpt-4o");
    expect(count).toBeGreaterThan(0);
    expect(Number.isInteger(count)).toBe(true);
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("", "gpt-4o")).toBe(0);
    expect(countTokens("", "gpt-4")).toBe(0);
    expect(countTokens("", "unknown-model")).toBe(0);
  });

  it("handles gpt-4 (cl100k_base encoding) correctly", () => {
    const count = countTokens("hello world", "gpt-4");
    expect(count).toBeGreaterThan(0);
    expect(Number.isInteger(count)).toBe(true);
  });

  it("handles o1 models (o200k_base) correctly", () => {
    const count = countTokens("hello world", "o1-preview");
    expect(count).toBeGreaterThan(0);
  });

  it("falls back to character heuristic for unknown models", () => {
    const text = "abcdefg"; // length 7
    const count = countTokens(text, "completely-made-up-model-xyz");
    // ceil(7 / 3.5) = 2
    expect(count).toBe(2);
  });

  it("character heuristic rounds up correctly", () => {
    // length 1, ceil(1/3.5) = 1
    expect(countTokens("a", "unknown-model-v3")).toBe(1);
    // length 8, ceil(8/3.5) = 3
    expect(countTokens("abcdefgh", "unknown-model-v3")).toBe(3);
  });
});

describe("estimateUsage", () => {
  it("counts messages separately from the response", () => {
    const messages = [
      { role: "user", content: "Hi there" },
      { role: "assistant", content: "Previous reply" },
    ];
    const responseText = "This is the new assistant reply.";

    const usage = estimateUsage(messages, responseText, "gpt-4o");

    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.completionTokens).toBeGreaterThan(0);
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    expect(usage.model).toBe("gpt-4o");
  });

  it("returns zero for empty inputs", () => {
    const usage = estimateUsage([], "", "gpt-4o");
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);
  });

  it("preserves the model identifier", () => {
    const usage = estimateUsage([{ role: "user", content: "hi" }], "reply", "gpt-4o-mini");
    expect(usage.model).toBe("gpt-4o-mini");
  });
});
