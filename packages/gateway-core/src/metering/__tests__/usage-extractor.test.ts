import { describe, expect, it } from "vitest";
import { createStreamingUsageExtractor, extractUsageFromJson } from "../usage-extractor.js";

describe("extractUsageFromJson", () => {
  it("returns a UsageResult from a valid OpenAI-shape response", () => {
    const response = {
      id: "chatcmpl-123",
      model: "gpt-4o",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };

    const result = extractUsageFromJson(response, "fallback-model");

    expect(result).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      model: "gpt-4o",
    });
  });

  it("returns null when the response is missing the usage field", () => {
    const response = { id: "chatcmpl-123", model: "gpt-4o" };

    expect(extractUsageFromJson(response, "fallback-model")).toBeNull();
  });

  it("returns null when usage is partial (missing completion_tokens)", () => {
    const response = {
      model: "gpt-4o",
      usage: { prompt_tokens: 5, total_tokens: 5 },
    };

    expect(extractUsageFromJson(response, "fallback-model")).toBeNull();
  });

  it("falls back to fallbackModel when response has no model", () => {
    const response = {
      usage: {
        prompt_tokens: 1,
        completion_tokens: 2,
        total_tokens: 3,
      },
    };

    const result = extractUsageFromJson(response, "gpt-4o-fallback");
    expect(result?.model).toBe("gpt-4o-fallback");
  });

  it("returns null for null/undefined input", () => {
    expect(extractUsageFromJson(null, "gpt-4o")).toBeNull();
    expect(extractUsageFromJson(undefined, "gpt-4o")).toBeNull();
  });

  it("returns null for non-object input (string)", () => {
    expect(extractUsageFromJson("not-an-object", "gpt-4o")).toBeNull();
  });
});

describe("createStreamingUsageExtractor", () => {
  it("accumulates content across multiple chunks", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    extractor.processChunk(
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello" } }] })}`,
    );
    extractor.processChunk(
      `data: ${JSON.stringify({ choices: [{ delta: { content: " world" } }] })}`,
    );

    expect(extractor.getAccumulatedContent()).toBe("Hello world");
  });

  it("detects the usage frame emitted before [DONE]", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    extractor.processChunk(`data: ${JSON.stringify({ choices: [{ delta: { content: "hi" } }] })}`);
    extractor.processChunk(
      `data: ${JSON.stringify({
        model: "gpt-4o-2024-08-06",
        usage: {
          prompt_tokens: 3,
          completion_tokens: 1,
          total_tokens: 4,
        },
      })}`,
    );
    extractor.processChunk("data: [DONE]");

    const usage = extractor.getUsage();
    expect(usage).toEqual({
      promptTokens: 3,
      completionTokens: 1,
      totalTokens: 4,
      model: "gpt-4o-2024-08-06",
    });
  });

  it("returns null from getUsage() when no usage frame was seen", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    extractor.processChunk(`data: ${JSON.stringify({ choices: [{ delta: { content: "hi" } }] })}`);
    extractor.processChunk("data: [DONE]");

    expect(extractor.getUsage()).toBeNull();
  });

  it("handles multiple data: entries in one chunk (newline-split)", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    const multiLine = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: "a" } }] })}`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: "b" } }] })}`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: "c" } }] })}`,
    ].join("\n");

    extractor.processChunk(multiLine);

    expect(extractor.getAccumulatedContent()).toBe("abc");
  });

  it("ignores malformed JSON in data frames (does not throw)", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    expect(() => extractor.processChunk("data: {not-valid-json")).not.toThrow();
    expect(extractor.getAccumulatedContent()).toBe("");
    expect(extractor.getUsage()).toBeNull();
  });

  it("[DONE] sentinel does not corrupt state", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    extractor.processChunk(
      `data: ${JSON.stringify({ choices: [{ delta: { content: "hello" } }] })}`,
    );
    extractor.processChunk("data: [DONE]");
    extractor.processChunk("data: [DONE]");

    expect(extractor.getAccumulatedContent()).toBe("hello");
    expect(extractor.getUsage()).toBeNull();
  });

  it("ignores empty lines and lines that do not start with 'data: '", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o");

    extractor.processChunk("");
    extractor.processChunk("not a data line");
    extractor.processChunk(`data: ${JSON.stringify({ choices: [{ delta: { content: "x" } }] })}`);

    expect(extractor.getAccumulatedContent()).toBe("x");
  });

  it("uses fallbackModel when usage frame has no model field", () => {
    const extractor = createStreamingUsageExtractor("gpt-4o-fallback");

    extractor.processChunk(
      `data: ${JSON.stringify({
        usage: {
          prompt_tokens: 1,
          completion_tokens: 2,
          total_tokens: 3,
        },
      })}`,
    );

    expect(extractor.getUsage()?.model).toBe("gpt-4o-fallback");
  });
});
