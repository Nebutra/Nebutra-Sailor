import { logger } from "@nebutra/logger";
import { z } from "zod";
import type { UsageResult } from "../types.js";

/**
 * OpenAI-compatible usage schema.
 *
 * OpenAI and OpenAI-compatible providers return usage in this shape. When
 * streaming, the final SSE frame (before `[DONE]`) carries this object when
 * the request includes `stream_options.include_usage: true`.
 */
export const OpenAIUsageSchema = z.object({
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
});

const OpenAIResponseShapeSchema = z
  .object({
    model: z.string().optional(),
    usage: OpenAIUsageSchema.optional(),
  })
  .passthrough();

/**
 * Extract usage from a non-streaming JSON response body.
 *
 * Returns `null` when the response does not contain a valid `usage` object.
 * The caller should fall back to local token counting in that case.
 */
export function extractUsageFromJson(
  responseBody: unknown,
  fallbackModel: string,
): UsageResult | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const parsed = OpenAIResponseShapeSchema.safeParse(responseBody);
  if (!parsed.success) {
    return null;
  }

  const { model, usage } = parsed.data;
  if (!usage) {
    return null;
  }

  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    model: model ?? fallbackModel,
  };
}

interface StreamingUsageExtractor {
  processChunk: (line: string) => void;
  getUsage: () => UsageResult | null;
  getAccumulatedContent: () => string;
}

/**
 * Create a stateful extractor for OpenAI-compatible SSE streams.
 *
 * Handles:
 * - `data: ` prefixed frames
 * - `[DONE]` sentinel
 * - Multiple frames packed into a single chunk (newline-split)
 * - Malformed JSON (log-and-continue)
 * - Usage frames that arrive in any position
 * - Content deltas that accumulate into `getAccumulatedContent()`
 */
export function createStreamingUsageExtractor(fallbackModel: string): StreamingUsageExtractor {
  let accumulatedContent = "";
  let capturedUsage: UsageResult | null = null;

  const handleFrame = (dataStr: string): void => {
    if (dataStr === "[DONE]") {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      // Malformed frames are logged and skipped; the stream must not die
      // because one byte-split chunk arrived mid-frame.
      logger.warn("usage-extractor: skipped malformed SSE data frame", {
        preview: dataStr.slice(0, 120),
      });
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const obj = parsed as Record<string, unknown>;

    // Usage frame detection — a frame can carry `usage` alone or with choices
    if (obj.usage && typeof obj.usage === "object") {
      const usageParse = OpenAIUsageSchema.safeParse(obj.usage);
      if (usageParse.success) {
        const model = typeof obj.model === "string" ? obj.model : fallbackModel;
        capturedUsage = {
          promptTokens: usageParse.data.prompt_tokens,
          completionTokens: usageParse.data.completion_tokens,
          totalTokens: usageParse.data.total_tokens,
          model,
        };
      }
    }

    // Content delta accumulation
    const choices = obj.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0] as Record<string, unknown> | undefined;
      const delta = first?.delta as Record<string, unknown> | undefined;
      const content = delta?.content;
      if (typeof content === "string") {
        accumulatedContent += content;
      }
    }
  };

  return {
    processChunk(rawChunk: string): void {
      const lines = rawChunk.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || !trimmed.startsWith("data: ")) {
          continue;
        }
        const dataStr = trimmed.slice(6);
        handleFrame(dataStr);
      }
    },
    getUsage(): UsageResult | null {
      return capturedUsage;
    },
    getAccumulatedContent(): string {
      return accumulatedContent;
    },
  };
}
