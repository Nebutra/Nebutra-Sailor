/**
 * @nebutra/ai-providers - Configuration
 *
 * Model configurations and recommended defaults
 */

import { ANTHROPIC_MODELS } from "../providers/anthropic.js";
import type { ProviderModel } from "../providers/base.js";
import { GOOGLE_MODELS } from "../providers/google.js";
import { OPENAI_MODELS } from "../providers/openai.js";
import { OPENROUTER_MODELS } from "../providers/openrouter.js";
import { SILICONFLOW_MODELS } from "../providers/siliconflow.js";
import type { ProviderName } from "../types.js";

// ============================================
// Default Models by Provider
// ============================================

export const DEFAULT_MODELS: Record<ProviderName, { chat: string; embedding: string }> = {
  siliconflow: {
    chat: "deepseek-ai/DeepSeek-V3",
    embedding: "BAAI/bge-m3",
  },
  openai: {
    chat: "gpt-5.2",
    embedding: "text-embedding-3-small",
  },
  anthropic: {
    chat: "claude-3-5-sonnet-20241022",
    embedding: "text-embedding-3-small", // Anthropic doesn't have embeddings, fallback
  },
  google: {
    chat: "gemini-1.5-flash",
    embedding: "text-embedding-004",
  },
  openrouter: {
    chat: "openai/gpt-5.2",
    embedding: "openai/text-embedding-3-small",
  },
};

// ============================================
// Model Registry
// ============================================

const MODEL_REGISTRY: Record<ProviderName, ProviderModel[]> = {
  siliconflow: SILICONFLOW_MODELS,
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  google: GOOGLE_MODELS,
  openrouter: OPENROUTER_MODELS,
};

/**
 * Get all models for a provider
 */
export function getModelsForProvider(provider: ProviderName): ProviderModel[] {
  return MODEL_REGISTRY[provider] || [];
}

/**
 * Get a specific model by ID
 */
export function getModel(provider: ProviderName, modelId: string): ProviderModel | undefined {
  return MODEL_REGISTRY[provider]?.find((m) => m.id === modelId);
}

/**
 * Get all models across all providers
 */
export function getAllModels(): Array<ProviderModel & { provider: ProviderName }> {
  return Object.entries(MODEL_REGISTRY).flatMap(([provider, models]) =>
    models.map((m) => ({ ...m, provider: provider as ProviderName })),
  );
}

// ============================================
// Provider Selection Helpers
// ============================================

export interface ProviderSelectionCriteria {
  /** Required capabilities */
  capabilities?: string[];
  /** Prefer cheaper options */
  preferCheap?: boolean;
  /** Prefer faster options */
  preferFast?: boolean;
  /** Minimum context window */
  minContextWindow?: number;
}

/**
 * Find the best model matching criteria
 */
export function findBestModel(
  criteria: ProviderSelectionCriteria,
): (ProviderModel & { provider: ProviderName }) | undefined {
  const allModels = getAllModels();

  let candidates = allModels;

  // Filter by capabilities
  if (criteria.capabilities?.length) {
    candidates = candidates.filter((m) =>
      criteria.capabilities?.every((cap) =>
        m.capabilities.includes(cap as ProviderModel["capabilities"][number]),
      ),
    );
  }

  // Filter by context window
  if (criteria.minContextWindow) {
    candidates = candidates.filter(
      (m) =>
        m.contextWindow &&
        criteria.minContextWindow &&
        m.contextWindow >= criteria.minContextWindow,
    );
  }

  if (candidates.length === 0) return undefined;

  // Sort by preference
  if (criteria.preferCheap) {
    candidates.sort((a, b) => {
      const priceA = (a.inputPricePerMillion || 0) + (a.outputPricePerMillion || 0);
      const priceB = (b.inputPricePerMillion || 0) + (b.outputPricePerMillion || 0);
      return priceA - priceB;
    });
  }

  return candidates[0];
}

// ============================================
// Environment Configuration
// ============================================

export interface EnvironmentConfig {
  siliconflow?: {
    apiKey?: string;
    useInternational?: boolean;
  };
  openai?: {
    apiKey?: string;
    organization?: string;
  };
  openrouter?: {
    apiKey?: string;
    httpReferer?: string;
    appTitle?: string;
  };
  defaultProvider?: ProviderName;
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): EnvironmentConfig {
  return {
    siliconflow: {
      apiKey: process.env.SILICONFLOW_API_KEY,
      useInternational: process.env.SILICONFLOW_USE_INTERNATIONAL === "true",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      appTitle: process.env.OPENROUTER_APP_TITLE,
    },
    defaultProvider: (process.env.DEFAULT_AI_PROVIDER as ProviderName) || "siliconflow",
  };
}
