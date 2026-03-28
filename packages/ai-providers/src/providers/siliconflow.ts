import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderConfig,
  RerankRequest,
  RerankResponse,
} from "../types.js";
import {
  BaseAIProvider,
  type ProviderCapability,
  type ProviderModel,
  registerProvider,
} from "./base.js";

// ============================================
// SiliconFlow Configuration
// ============================================

const SILICONFLOW_BASE_URL_CN = "https://api.siliconflow.cn/v1";
const SILICONFLOW_BASE_URL_INTL = "https://api.siliconflow.com/v1";

export interface SiliconFlowConfig extends ProviderConfig {
  /**
   * Use international endpoint instead of China endpoint
   * @default false
   */
  useInternational?: boolean;
}

// ============================================
// SiliconFlow Models
// ============================================

export const SILICONFLOW_MODELS: ProviderModel[] = [
  // Chat Models - DeepSeek
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3",
    description: "Latest DeepSeek model with strong reasoning capabilities",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 164000,
    inputPricePerMillion: 0.27,
    outputPricePerMillion: 0.41,
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1",
    description: "Reasoning-focused model with chain-of-thought",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 164000,
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
  },
  {
    id: "deepseek-ai/DeepSeek-V2.5",
    name: "DeepSeek V2.5",
    description: "Balanced performance and cost",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 128000,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
  },

  // Chat Models - Qwen
  {
    id: "Qwen/QwQ-32B",
    name: "Qwen QwQ-32B",
    description: "Qwen reasoning model with deep thinking",
    capabilities: ["chat", "chat-stream", "reasoning"],
    contextWindow: 32768,
    inputPricePerMillion: 1.26,
    outputPricePerMillion: 1.26,
  },
  {
    id: "Qwen/Qwen2.5-Coder-32B-Instruct",
    name: "Qwen2.5 Coder 32B",
    description: "Code-specialized model from Qwen",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 32768,
    inputPricePerMillion: 1.26,
    outputPricePerMillion: 1.26,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen2.5 72B Instruct",
    description: "Large Qwen model for complex tasks",
    capabilities: ["chat", "chat-stream", "function-calling"],
    contextWindow: 32768,
    inputPricePerMillion: 4.13,
    outputPricePerMillion: 4.13,
  },

  // Embedding Models
  {
    id: "BAAI/bge-m3",
    name: "BGE-M3",
    description: "Multilingual embedding model, 8192 token context",
    capabilities: ["embeddings"],
    contextWindow: 8192,
    inputPricePerMillion: 0.01,
  },
  {
    id: "BAAI/bge-large-en-v1.5",
    name: "BGE Large EN v1.5",
    description: "English embedding model, 512 token context",
    capabilities: ["embeddings"],
    contextWindow: 512,
    inputPricePerMillion: 0.01,
  },
  {
    id: "BAAI/bge-large-zh-v1.5",
    name: "BGE Large ZH v1.5",
    description: "Chinese embedding model, 512 token context",
    capabilities: ["embeddings"],
    contextWindow: 512,
    inputPricePerMillion: 0.01,
  },

  // Rerank Models
  {
    id: "BAAI/bge-reranker-v2-m3",
    name: "BGE Reranker v2 M3",
    description: "Multilingual document reranking model",
    capabilities: ["rerank"],
    inputPricePerMillion: 0.1,
  },

  // Image Models
  {
    id: "stabilityai/stable-diffusion-3-5-large",
    name: "Stable Diffusion 3.5 Large",
    description: "High-quality image generation",
    capabilities: ["image-generation"],
  },
  {
    id: "black-forest-labs/FLUX.1-schnell",
    name: "FLUX.1 Schnell",
    description: "Fast image generation",
    capabilities: ["image-generation"],
  },
];

// ============================================
// SiliconFlow Provider Implementation
// ============================================

export class SiliconFlowProvider extends BaseAIProvider {
  readonly name = "siliconflow" as const;
  readonly displayName = "SiliconFlow";

  private client: OpenAI;
  private capabilities: Set<ProviderCapability>;

  constructor(config: SiliconFlowConfig) {
    const baseUrl =
      config.baseUrl ||
      (config.useInternational ? SILICONFLOW_BASE_URL_INTL : SILICONFLOW_BASE_URL_CN);

    super({
      ...config,
      baseUrl,
    });

    this.validateApiKey();

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    this.capabilities = new Set([
      "chat",
      "chat-stream",
      "embeddings",
      "rerank",
      "image-generation",
      "function-calling",
      "reasoning",
    ]);
  }

  // ============================================
  // Chat Completions
  // ============================================

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
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
      tools: request.tools?.map((t) => ({
        type: t.type,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      })),
      response_format: request.responseFormat,
      stream: false,
    });

    return this.transformChatResponse(response);
  }

  async *chatStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const stream = await this.client.chat.completions.create({
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
    });

    for await (const chunk of stream) {
      yield this.transformStreamChunk(chunk);
    }
  }

  // ============================================
  // Embeddings
  // ============================================

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.client.embeddings.create({
      model: request.model,
      input: request.input,
      encoding_format: request.encodingFormat,
    });

    return {
      object: "list",
      data: response.data.map((d, i) => ({
        object: "embedding" as const,
        index: i,
        embedding: d.embedding,
      })),
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  // ============================================
  // Rerank (SiliconFlow specific)
  // ============================================

  async rerank(request: RerankRequest): Promise<RerankResponse> {
    // SiliconFlow rerank API endpoint
    const response = await fetch(`${this.config.baseUrl}/rerank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        query: request.query,
        documents: request.documents,
        top_n: request.topN,
        return_documents: request.returnDocuments,
        max_chunks_per_doc: request.maxChunksPerDoc,
      }),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(
        `SiliconFlow rerank error: ${response.status} ${error.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      results: Array<{
        index: number;
        document?: { text: string };
        relevance_score: number;
      }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return {
      object: "list",
      results: data.results.map((r) => ({
        index: r.index,
        document: r.document,
        relevanceScore: r.relevance_score,
      })),
      model: data.model,
      usage: data.usage ? { totalTokens: data.usage.total_tokens } : undefined,
    };
  }

  // ============================================
  // Image Generation
  // ============================================

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const response = await this.client.images.generate({
      model: request.model,
      prompt: request.prompt,
      n: request.n,
      size: request.size as "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792",
      quality: request.quality,
      style: request.style,
      response_format: request.responseFormat,
    });

    return {
      created: response.created,
      data: (response.data || []).map((d) => ({
        url: d.url,
        b64Json: d.b64_json,
        revisedPrompt: d.revised_prompt,
      })),
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  supportsCapability(capability: ProviderCapability): boolean {
    return this.capabilities.has(capability);
  }

  getAvailableModels(): ProviderModel[] {
    return SILICONFLOW_MODELS;
  }

  /**
   * Get user info including balance
   */
  async getUserInfo(): Promise<{ balance: number; status: string }> {
    const response = await fetch(`${this.config.baseUrl}/user/info`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const data = (await response.json()) as {
      data?: { balance?: number; status?: string };
    };
    return {
      balance: data.data?.balance || 0,
      status: data.data?.status || "unknown",
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

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
          // SiliconFlow returns reasoning_content for DeepSeek-R1 models
          reasoningContent: (c.message as { reasoning_content?: string }).reasoning_content,
        },
        finishReason: c.finish_reason as "stop" | "length" | "tool_calls" | "content_filter" | null,
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
        finishReason: c.finish_reason as "stop" | "length" | "tool_calls" | "content_filter" | null,
      })),
    };
  }
}

// Register the provider
registerProvider("siliconflow", (config) => new SiliconFlowProvider(config as SiliconFlowConfig));

export default SiliconFlowProvider;
