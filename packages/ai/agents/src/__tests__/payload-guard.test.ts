import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeOpenAIJsonPayload,
  findOversizedPropertyName,
  OPENAI_MAX_PROPERTY_NAME_LENGTH,
} from "../sdk/payload-guard";

describe("OpenAI payload guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("finds object property names that OpenAI would reject", () => {
    const key = "x".repeat(OPENAI_MAX_PROPERTY_NAME_LENGTH + 1);
    const issue = findOversizedPropertyName({
      input: [{ type: "function_call", arguments: { [key]: true } }],
    });

    expect(issue).toEqual({
      path: '$.input[0].arguments["xxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."]',
      length: OPENAI_MAX_PROPERTY_NAME_LENGTH + 1,
    });
  });

  it("allows long generated text when it is stored as a value", () => {
    expect(() =>
      assertSafeOpenAIJsonPayload("OpenAI request messages", {
        input: [{ arguments: { query: "x".repeat(10_000) } }],
      }),
    ).not.toThrow();
  });

  it("rejects malformed tool-call input before invoking the AI SDK", async () => {
    const generateTextMock = vi.fn(async () => ({ text: "unused" }));
    vi.doMock("ai", () => ({
      embed: vi.fn(),
      embedMany: vi.fn(),
      generateText: generateTextMock,
      jsonSchema: vi.fn((schema: unknown) => schema),
      streamText: vi.fn(),
      tool: vi.fn((definition: unknown) => definition),
    }));

    const { generateText } = await import("../sdk/index");
    const key = "bad".repeat(100);

    await expect(
      generateText(
        [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "call_1",
                toolName: "finder_srv",
                input: { [key]: true },
              },
            ],
          },
        ] as never,
        { model: "fast" },
      ),
    ).rejects.toThrow(/property name.*maximum is 256/i);
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});
