import { logger } from "@nebutra/logger";
// Type-only, erased at compile time — does not pull the package into a bundle.
import type { TiktokenModel } from "js-tiktoken";
// Resolved by the "#tokenizer" condition: Node gets js-tiktoken, workerd gets
// a stub that returns null so the character heuristic below is used. A direct
// import would put several megabytes of BPE tables in the Workers bundle, to
// be parsed inside a startup budget of a few hundred milliseconds.
import { getEncoding } from "#tokenizer";
import type { UsageResult } from "../types";

const CHAR_PER_TOKEN_HEURISTIC = 3.5;

type EncodingName = "o200k_base" | "cl100k_base";

/**
 * Best-effort mapping from a model identifier to the correct tiktoken
 * encoding. Accepts bare ids or provider-prefixed ids (openai/gpt-5.5).
 * Prefer o200k for current OpenAI frontier (GPT-5 / o-series / 4o-class);
 * cl100k only for older chat / embeddings. Unknown → null (char heuristic).
 *
 * @see https://models.dev — model ids; OpenAI tokenizer families
 */
function resolveEncoding(model: string): EncodingName | null {
  const lower = model.toLowerCase().replace(/^[^/]+\//, ""); // strip provider/

  // Current OpenAI chat + reasoning tokenizers (o200k)
  if (
    lower.startsWith("gpt-5") ||
    lower.startsWith("gpt-4o") ||
    lower.startsWith("gpt-4.1") ||
    lower.startsWith("chatgpt") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4")
  ) {
    return "o200k_base";
  }

  // Older OpenAI chat + embeddings (cl100k)
  if (
    lower.startsWith("gpt-4") ||
    lower.startsWith("gpt-3.5") ||
    lower.startsWith("text-embedding-3-") ||
    lower.startsWith("text-embedding-ada-002")
  ) {
    return "cl100k_base";
  }

  return null;
}

/**
 * Count tokens using the correct tiktoken encoding for a given model.
 *
 * - Empty string returns 0
 * - Known model families use their tiktoken encoding
 * - Unknown models fall back to `ceil(chars / 3.5)` as a conservative
 *   over-estimate; charging slightly more on an unknown model is safer than
 *   charging zero.
 */
export function countTokens(text: string, model: string): number {
  if (text.length === 0) {
    return 0;
  }

  const encodingName = resolveEncoding(model);
  if (encodingName === null) {
    return Math.ceil(text.length / CHAR_PER_TOKEN_HEURISTIC);
  }

  try {
    // js-tiktoken exposes two APIs; `encodingForModel` is stricter about the
    // model id, so we prefer the raw `getEncoding` path which is guaranteed
    // to work for the encoding names we mapped above.
    const enc = getEncoding(encodingName);
    if (!enc) return Math.ceil(text.length / CHAR_PER_TOKEN_HEURISTIC);
    return enc.encode(text).length;
  } catch (error) {
    logger.warn("tiktoken-fallback: encoding failed, using char heuristic", {
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return Math.ceil(text.length / CHAR_PER_TOKEN_HEURISTIC);
  }
}

export interface MessageForCounting {
  role: string;
  content: string;
}

/**
 * Estimate usage when upstream did not return it.
 *
 * The estimate counts:
 * - prompt tokens: the concatenation of message roles + content
 * - completion tokens: the assistant response text
 *
 * This is an approximation — the exact wire format depends on the provider
 * and model, but for billing-fallback purposes it is accurate enough.
 */
export function estimateUsage(
  messages: MessageForCounting[],
  responseText: string,
  model: string,
): UsageResult {
  const promptText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const promptTokens = countTokens(promptText, model);
  const completionTokens = countTokens(responseText, model);

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    model,
  };
}

// Re-export for consumers that want the raw tiktoken type
export type { TiktokenModel };
