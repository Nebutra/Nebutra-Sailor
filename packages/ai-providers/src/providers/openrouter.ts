import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ProviderConfig,
} from "../types.js";
import {
  BaseAIProvider,
  type ProviderCapability,
  type ProviderModel,
  registerProvider,
} from "./base.js";

// ============================================
// OpenRouter Configuration
// ============================================

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterConfig extends ProviderConfig {
  /**
   * HTTP Referer header for app attribution
   * Your app's URL for OpenRouter leaderboards
   */
  httpReferer?: string;

  /**
   * X-Title header for app attribution
   * Your app's name for OpenRouter leaderboards
   */
  appTitle?: string;

  /**
   * Default provider preferences for all requests
   */
  defaultProviderPreferences?: OpenRouterProviderPreferences;
}

// ============================================
// OpenRouter Provider Routing Types
// ============================================

/**
 * Provider routing preferences for OpenRouter
 * Allows controlling which providers handle requests
 */
export interface OpenRouterProviderPreferences {
  /**
   * Allow backup providers if primary fails
   * @default true
   */
  allowFallbacks?: boolean;

  /**
   * Require specific parameters support from provider
   */
  requireParameters?: boolean;

  /**
   * Data privacy preferences
   */
  dataCollection?: "deny" | "allow";

  /**
   * Order providers by preference
   * Options: "price" | "throughput" | "latency"
   */
  sort?: "price" | "throughput" | "latency";

  /**
   * Specific providers to use (order matters)
   */
  order?: string[];

  /**
   * Providers to ignore
   */
  ignore?: string[];

  /**
   * Only allow specific providers (exclusive)
   */
  only?: string[];

  /**
   * Quantization preferences
   * e.g., ["int4", "int8", "fp8"]
   */
  quantizations?: string[];
}

/**
 * Model routing configuration for fallbacks
 */
export interface OpenRouterModelRouting {
  /**
   * List of model IDs to try in order
   * First available model will be used
   */
  models: string[];
}

/**
 * Extended chat request with OpenRouter-specific options
 */
export interface OpenRouterChatRequest extends ChatCompletionRequest {
  /**
   * Provider preferences for this request
   */
  provider?: OpenRouterProviderPreferences;

  /**
   * Model routing/fallback configuration
   * Alternative models to try if primary fails
   */
  route?: "fallback";

  /**
   * List of fallback models
   */
  models?: string[];

  /**
   * OpenRouter-specific transforms
   */
  transforms?: "middle-out"[];
}

// ============================================
// OpenRouter Models (Popular Examples)
// ============================================

export const OPENROUTER_MODELS: ProviderModel[] = [
  // OpenAI Models
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    description: "OpenAI's most capable model",
    capabilities: ["chat", "chat-stream", "function-calling", "vision", "reasoning"],
    contextWindow: 1000000,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 15.0,
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    description: "Standard model for general use",
    capabilities: ["chat", "chat-stream", "function-calling", "vision"],
    contextWindow: 128000,
    inputPricePerMillion: 1.75,
    outputPricePerMillion: 14.0,
  },
  {
    id: "openai/o3",
    name: "OpenAI o3",
    description: "Powerful reasoning model",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 200000,
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 8.0,
  },
  {
    id: "openai/o3-mini",
    name: "OpenAI o3-mini",
    description: "Fast reasoning model",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 200000,
    inputPricePerMillion: 1.1,
    outputPricePerMillion: 4.4,
  },

  // Anthropic Models
  {
    id: "anthropic/claude-4.6-sonnet",
    name: "Claude 4.6 Sonnet",
    description: "Latest Claude 4.6 model with 1M context",
    capabilities: ["chat", "chat-stream", "function-calling", "vision", "reasoning"],
    contextWindow: 1000000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  {
    id: "anthropic/claude-4.5-haiku",
    name: "Claude 4.5 Haiku",
    description: "Fast and efficient Claude 4.5 model",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 200000,
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4,
  },

  // xAI Models
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "xAI's flagship fast reasoning model",
    capabilities: ["chat", "chat-stream", "function-calling", "reasoning"],
    contextWindow: 2000000,
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 10.0,
  },
  {
    id: "x-ai/grok-3",
    name: "Grok 3",
    description: "xAI's versatile enterprise model",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 128000,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
  },

  // Google Models
  {
    id: "google/gemini-3.1-flash",
    name: "Gemini 3.1 Flash",
    description: "Google's fast, efficient multimodal model",
    capabilities: ["chat", "chat-stream", "vision"],
    contextWindow: 1000000,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.5,
  },
  {
    id: "google/gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    description: "Google's flagship model with advanced analysis",
    capabilities: ["chat", "chat-stream", "function-calling", "vision"],
    contextWindow: 2000000,
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 12.0,
  },

  // Meta Models
  {
    id: "meta-llama/llama-4-scout",
    name: "Llama 4 Scout (109B)",
    description: "Meta's efficient MoE model",
    capabilities: ["chat", "chat-stream", "function-calling", "vision"],
    contextWindow: 128000,
    inputPricePerMillion: 0.4,
    outputPricePerMillion: 0.4,
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick (400B)",
    description: "Meta's largest cutting-edge model",
    capabilities: ["chat", "chat-stream", "function-calling", "vision"],
    contextWindow: 128000,
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 2.0,
  },

  // DeepSeek Models
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "Reasoning model with chain-of-thought",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 164000,
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    description: "DeepSeek's chat model (V3)",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 164000,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
  },

  // Mistral Models
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large (Nov 2024)",
    description: "Mistral's flagship model",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 128000,
    inputPricePerMillion: 2,
    outputPricePerMillion: 6,
  },
  {
    id: "mistralai/codestral-2501",
    name: "Codestral (Jan 2025)",
    description: "Mistral's code-specialized model",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 256000,
    inputPricePerMillion: 0.3,
    outputPricePerMillion: 0.9,
  },

  // Qwen Models
  {
    id: "qwen/qwq-32b",
    name: "Qwen QwQ 32B",
    description: "Qwen's reasoning model",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 32768,
    inputPricePerMillion: 0.12,
    outputPricePerMillion: 0.18,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    description: "Qwen's code-specialized model",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 32768,
    inputPricePerMillion: 0.07,
    outputPricePerMillion: 0.16,
  },

  // Auto Model
  {
    id: "openrouter/auto",
    name: "OpenRouter Auto",
    description: "Auto-select best model for the task",
    capabilities: ["chat", "chat-stream"],
    contextWindow: 128000,
  },
];

// ============================================
// OpenRouter Model Variants
// ============================================

/**
 * Model variant suffixes for specialized routing
 */
export const OPENROUTER_VARIANTS = {
  /** Fastest available provider */
  NITRO: ":nitro",
  /** Floor pricing (cheapest) */
  FLOOR: ":floor",
  /** Curated for better tool-calling accuracy */
  EXACTO: ":exacto",
  /** Extended context window */
  EXTENDED: ":extended",
  /** Free tier (rate limited) */
  FREE: ":free",
} as const;

// ============================================
// OpenRouter Provider Implementation
// ============================================

export class OpenRouterProvider extends BaseAIProvider {
  readonly name = "openrouter" as const;
  readonly displayName = "OpenRouter";

  private client: OpenAI;
  private capabilities: Set<ProviderCapability>;
  private httpReferer?: string;
  private appTitle?: string;
  private defaultProviderPreferences?: OpenRouterProviderPreferences;

  constructor(config: OpenRouterConfig) {
    const baseUrl = config.baseUrl || OPENROUTER_BASE_URL;

    super({
      ...config,
      baseUrl,
    });

    this.validateApiKey();

    this.httpReferer = config.httpReferer;
    this.appTitle = config.appTitle;
    this.defaultProviderPreferences = config.defaultProviderPreferences;

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      defaultHeaders: this.buildDefaultHeaders(),
    });

    this.capabilities = new Set(["chat", "chat-stream", "function-calling", "vision", "reasoning"]);
  }

  // ============================================
  // Chat Completions
  // ============================================

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const openRouterRequest = request as OpenRouterChatRequest;

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
        name: m.name,
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stop: request.stop,
      stream: false,
      response_format: request.responseFormat,
    };

    // Add tools if present
    if (request.tools) {
      body.tools = request.tools.map((t) => ({
        type: t.type,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
      if (request.toolChoice) {
        body.tool_choice = request.toolChoice;
      }
    }

    // Add OpenRouter-specific options
    if (openRouterRequest.provider || this.defaultProviderPreferences) {
      body.provider = {
        ...this.defaultProviderPreferences,
        ...openRouterRequest.provider,
      };
    }

    if (openRouterRequest.models) {
      body.models = openRouterRequest.models;
      body.route = openRouterRequest.route || "fallback";
    }

    if (openRouterRequest.transforms) {
      body.transforms = openRouterRequest.transforms;
    }

    const response = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );

    return this.transformChatResponse(response);
  }

  async *chatStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const openRouterRequest = request as OpenRouterChatRequest;

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
        name: m.name,
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stop: request.stop,
      stream: true,
    };

    // Add tools if present
    if (request.tools) {
      body.tools = request.tools.map((t) => ({
        type: t.type,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    // Add OpenRouter-specific options
    if (openRouterRequest.provider || this.defaultProviderPreferences) {
      body.provider = {
        ...this.defaultProviderPreferences,
        ...openRouterRequest.provider,
      };
    }

    if (openRouterRequest.models) {
      body.models = openRouterRequest.models;
      body.route = openRouterRequest.route || "fallback";
    }

    const stream = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    );

    for await (const chunk of stream) {
      // Skip comment payloads from OpenRouter
      if (chunk.id === "") continue;
      yield this.transformStreamChunk(chunk);
    }
  }

  /**
   * Chat with model fallbacks
   * Automatically tries alternative models if primary fails
   */
  async chatWithFallback(
    request: ChatCompletionRequest,
    fallbackModels: string[],
  ): Promise<ChatCompletionResponse> {
    const openRouterRequest: OpenRouterChatRequest = {
      ...request,
      models: [request.model, ...fallbackModels],
      route: "fallback",
    };
    return this.chat(openRouterRequest);
  }

  // ============================================
  // Embeddings (via OpenRouter proxy)
  // ============================================

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // OpenRouter doesn't natively support embeddings API
    // but can proxy to providers that do
    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.buildDefaultHeaders(),
      },
      body: JSON.stringify({
        model: request.model,
        input: request.input,
        encoding_format: request.encodingFormat,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter embeddings error: ${response.status} ${(error as { message?: string }).message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
      model: string;
      usage: { prompt_tokens: number; total_tokens: number };
    };

    return {
      object: "list",
      data: data.data.map((d, i) => ({
        object: "embedding" as const,
        index: i,
        embedding: d.embedding,
      })),
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  // ============================================
  // OpenRouter Specific APIs
  // ============================================

  /**
   * Get available models from OpenRouter
   */
  async listModels(): Promise<OpenRouterModelInfo[]> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = (await response.json()) as { data: OpenRouterModelInfo[] };
    return data.data;
  }

  /**
   * Get generation details by ID
   * Useful for getting exact token counts and costs
   */
  async getGeneration(generationId: string): Promise<OpenRouterGeneration> {
    const response = await fetch(`${this.config.baseUrl}/generation?id=${generationId}`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get generation: ${response.status}`);
    }

    return response.json() as Promise<OpenRouterGeneration>;
  }

  /**
   * Get current account credits
   */
  async getCredits(): Promise<{ credits: number; usage: number }> {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get credits: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: { limit: number | null; usage: number };
    };
    return {
      credits: data.data.limit ?? Infinity,
      usage: data.data.usage,
    };
  }

  /**
   * Get rate limit status
   */
  async getRateLimits(): Promise<OpenRouterRateLimit> {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get rate limits: ${response.status}`);
    }

    const data = (await response.json()) as { data: OpenRouterRateLimit };
    return data.data;
  }

  // ============================================
  // Utility Methods
  // ============================================

  supportsCapability(capability: ProviderCapability): boolean {
    return this.capabilities.has(capability);
  }

  getAvailableModels(): ProviderModel[] {
    return OPENROUTER_MODELS;
  }

  /**
   * Get model with variant suffix
   */
  getModelVariant(modelId: string, variant: keyof typeof OPENROUTER_VARIANTS): string {
    return `${modelId}${OPENROUTER_VARIANTS[variant]}`;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private buildDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.httpReferer) {
      headers["HTTP-Referer"] = this.httpReferer;
    }

    if (this.appTitle) {
      headers["X-Title"] = this.appTitle;
    }

    return headers;
  }

  private transformChatResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): ChatCompletionResponse {
    return {
      id: response.id,
      object: "chat.completion",
      created: response.created,
      model: response.model,
      choices: response.choices.map((c) => ({
        index: c.index,
        message: {
          role: "assistant" as const,
          content: c.message.content,
          toolCalls: c.message.tool_calls
            ?.filter(
              (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
                tc.type === "function",
            )
            .map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
          // OpenRouter may return reasoning for models like o1/DeepSeek-R1
          reasoningContent: (c.message as { reasoning?: string }).reasoning,
        },
        finishReason: this.normalizeFinishReason(c.finish_reason),
      })),
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  private transformStreamChunk(
    chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
  ): ChatCompletionChunk {
    return {
      id: chunk.id,
      object: "chat.completion.chunk",
      created: chunk.created,
      model: chunk.model,
      choices: chunk.choices.map((c) => ({
        index: c.index,
        delta: {
          role: c.delta.role as "assistant" | undefined,
          content: c.delta.content ?? undefined,
          toolCalls: c.delta.tool_calls?.map((tc) => ({
            id: tc.id || "",
            type: "function" as const,
            function: {
              name: tc.function?.name || "",
              arguments: tc.function?.arguments || "",
            },
          })),
        },
        finishReason: this.normalizeFinishReason(c.finish_reason),
      })),
    };
  }

  private normalizeFinishReason(
    reason: string | null,
  ): "stop" | "length" | "tool_calls" | "content_filter" | null {
    if (!reason) return null;

    // OpenRouter normalizes finish_reason but we handle edge cases
    switch (reason) {
      case "stop":
      case "length":
      case "tool_calls":
      case "content_filter":
        return reason;
      case "error":
        return "stop";
      default:
        return "stop";
    }
  }
}

// ============================================
// OpenRouter API Types
// ============================================

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  per_request_limits?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface OpenRouterGeneration {
  id: string;
  model: string;
  created_at: string;
  generation_time: number;
  tokens_prompt: number;
  tokens_completion: number;
  native_tokens_prompt?: number;
  native_tokens_completion?: number;
  num_media_prompt?: number;
  num_media_completion?: number;
  origin: string;
  total_cost: number;
}

export interface OpenRouterRateLimit {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
  rate_limit: {
    requests: number;
    interval: string;
  };
}

// Register the provider
registerProvider("openrouter", (config) => new OpenRouterProvider(config as OpenRouterConfig));

export default OpenRouterProvider;
