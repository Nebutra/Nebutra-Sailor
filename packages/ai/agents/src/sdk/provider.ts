import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import { type ResolvedNebutraAIConfig, resolveApiKey } from "./config";
import { resolveModel, toAi302ModelId } from "./models";

/**
 * Creates a language model instance based on the resolved config.
 *
 * Provider routing:
 * - "openrouter"   → @openrouter/ai-sdk-provider (300+ models, failover)
 * - "openai"       → @ai-sdk/openai (direct OpenAI API)
 * - "siliconflow"  → @ai-sdk/openai with SiliconFlow baseURL (OpenAI-compatible)
 * - "sensenova"    → @ai-sdk/openai with SenseNova compatible-mode baseURL
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
        baseURL: process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1",
      });
      return provider(modelId);
    }

    case "sensenova": {
      // 商汤 SenseNova Token Plan — OpenAI-compatible
      // Docs: https://github.com/OpenSenseNova/SenseNova6.7/blob/main/API_CN.md
      //       https://platform.sensenova.cn/docs
      // Base: https://token.sensenova.cn/v1  (NOT api.sensenova.cn)
      // Small chat models: sensenova-6.7-flash-lite, deepseek-v4-flash
      const provider = createOpenAI({
        apiKey,
        baseURL: process.env.SENSENOVA_BASE_URL ?? "https://token.sensenova.cn/v1",
      });
      return provider(modelId);
    }

    case "ai302": {
      // 302.AI — an aggregator in front of many vendors, OpenAI-compatible.
      // Base: https://api.302.ai/v1 (an unauthenticated POST answers
      // `Missing 302 Apikey`, so the path is right and auth is Bearer).
      // Model ids are vendor-native — "MiniMax-M2.1", "gpt-4o",
      // "claude-haiku-4-5-20251001" — so `toAi302ModelId` drops the gateway
      // prefix and applies the generated alias for the tiers 302 spells
      // differently. An id 302 does not know surfaces as its own 4xx rather
      // than being quietly rewritten into something else.
      const provider = createOpenAI({
        apiKey,
        baseURL: process.env.AI302_BASE_URL ?? "https://api.302.ai/v1",
      });
      return provider(toAi302ModelId(modelId));
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
