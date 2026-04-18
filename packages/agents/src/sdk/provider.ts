import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import { type ResolvedNebutraAIConfig, resolveApiKey } from "./config";
import { resolveModel } from "./models";

/**
 * Creates a language model instance based on the resolved config.
 *
 * Provider routing:
 * - "openrouter"   → @openrouter/ai-sdk-provider (300+ models, failover)
 * - "openai"       → @ai-sdk/openai (direct OpenAI API)
 * - "siliconflow"  → @ai-sdk/openai with SiliconFlow baseURL (OpenAI-compatible)
 * - "gateway"      → Vercel AI Gateway via plain model string (OIDC auth)
 */
export function createModel(modelOrPreset: string, config: ResolvedNebutraAIConfig): LanguageModel {
  const modelId = resolveModel(modelOrPreset);
  const apiKey = resolveApiKey(config);

  switch (config.provider) {
    case "openrouter": {
      const provider = createOpenRouter({
        apiKey,
        ...(config.headers ? { headers: config.headers } : {}),
        ...(config.extraBody ? { extraBody: config.extraBody } : {}),
      });
      return provider.chat(modelId);
    }

    case "openai": {
      const provider = createOpenAI({ apiKey });
      return provider(modelId);
    }

    case "siliconflow": {
      // SiliconFlow: OpenAI-compatible API with China-optimized infra
      // Models use "Vendor/Model" format, e.g. "Qwen/Qwen2.5-72B-Instruct"
      const provider = createOpenAI({
        apiKey,
        baseURL: "https://api.siliconflow.cn/v1",
      });
      return provider(modelId);
    }

    case "gateway": {
      // Vercel AI Gateway: use @ai-sdk/openai with gateway baseURL
      // OIDC token is passed as apiKey, routed through Vercel's proxy
      const provider = createOpenAI({
        apiKey,
        baseURL: "https://ai-gateway.vercel.sh/v1",
      });
      return provider(modelId);
    }
  }
}

/**
 * Creates an embedding model instance for vector operations.
 * Only supported with OpenRouter provider.
 */
export function createEmbeddingModel(
  modelOrPreset: string,
  config: ResolvedNebutraAIConfig,
): EmbeddingModel {
  const modelId = resolveModel(modelOrPreset);
  const apiKey = resolveApiKey(config);

  if (config.provider !== "openrouter") {
    throw new Error(
      `[@nebutra/agents] Embedding models are currently only supported with the "openrouter" provider.`,
    );
  }

  const provider = createOpenRouter({
    apiKey,
    ...(config.headers ? { headers: config.headers } : {}),
  });

  return provider.textEmbeddingModel(modelId);
}
