/**
 * Model presets for common Nebutra use cases.
 *
 * All IDs use "vendor/model" format (OpenRouter / SiliconFlow).
 * When using direct OpenAI provider, only OpenAI models are valid.
 * When using Vercel AI Gateway, use "provider/model" format.
 * When using SiliconFlow, use "Vendor/Model" format (e.g. "Qwen/Qwen2.5-72B-Instruct").
 */
export const models = {
  /** High-quality reasoning — default for complex tasks */
  flagship: "anthropic/claude-sonnet-4",

  /** Deep reasoning for architecture and research */
  reasoning: "anthropic/claude-opus-4",

  /** Fast + cheap — chat, summaries, classification */
  fast: "anthropic/claude-haiku-4",

  /** OpenAI flagship */
  "openai-flagship": "openai/gpt-5.4",

  /** Google flagship */
  "google-flagship": "google/gemini-2.5-pro",

  /** Google fast */
  "google-fast": "google/gemini-2.5-flash",

  /** Embedding model */
  embedding: "openai/text-embedding-3-small",

  /** Embedding model (high-dimensional) */
  "embedding-large": "openai/text-embedding-3-large",

  // --- SiliconFlow presets (use with provider: "siliconflow") ---

  /** SiliconFlow — Qwen 2.5 72B (flagship open-source) */
  "sf-qwen": "Qwen/Qwen2.5-72B-Instruct",

  /** SiliconFlow — DeepSeek R1 reasoning (via SiliconFlow Pro) */
  "sf-deepseek-r1": "Pro/deepseek-ai/DeepSeek-R1",

  /** SiliconFlow — DeepSeek V3 (fast, capable) */
  "sf-deepseek-v3": "deepseek-ai/DeepSeek-V3",
} as const;

export type ModelPreset = keyof typeof models;

/**
 * Resolves a model preset alias to its full model ID.
 * If the input is not a preset key, returns it as-is (passthrough).
 */
export function resolveModel(modelOrPreset: string): string {
  if (modelOrPreset in models) {
    return models[modelOrPreset as ModelPreset];
  }
  return modelOrPreset;
}
