import { describe, expect, it } from "vitest";
import { countTokens, estimateUsage } from "../tiktoken-fallback";

describe("countTokens", () => {
  it("returns a reasonable positive integer for plain text on gpt-5.5", () => {
    const count = countTokens("hello world", "gpt-5.5");
    expect(count).toBeGreaterThan(0);
    expect(Number.isInteger(count)).toBe(true);
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("", "gpt-5.5")).toBe(0);
    expect(countTokens("", "openai/gpt-5.5")).toBe(0);
    expect(countTokens("", "unknown-model")).toBe(0);
  });

  it("maps GPT-5 / o-series families to o200k_base", () => {
    expect(countTokens("hello world", "gpt-5.5")).toBeGreaterThan(0);
    expect(countTokens("hello world", "openai/gpt-5.4-mini")).toBeGreaterThan(0);
    expect(countTokens("hello world", "o3")).toBeGreaterThan(0);
  });

  it("still maps historical gpt-4 id to cl100k_base (compat)", () => {
    // encoding map must keep retired product lines for long-lived usage logs
    const count = countTokens("hello world", "gpt-4");
    expect(count).toBeGreaterThan(0);
    expect(Number.isInteger(count)).toBe(true);
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

    const usage = estimateUsage(messages, responseText, "gpt-5.5");

    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.completionTokens).toBeGreaterThan(0);
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    expect(usage.model).toBe("gpt-5.5");
  });

  it("returns zero for empty inputs", () => {
    const usage = estimateUsage([], "", "gpt-5.5");
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);
  });

  it("preserves the model identifier", () => {
    const usage = estimateUsage([{ role: "user", content: "hi" }], "reply", "gpt-5.4-mini");
    expect(usage.model).toBe("gpt-5.4-mini");
  });
});
