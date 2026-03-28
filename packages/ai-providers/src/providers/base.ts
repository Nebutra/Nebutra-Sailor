import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderConfig,
  ProviderName,
  RerankRequest,
  RerankResponse,
  SpeechToTextRequest,
  TextToSpeechRequest,
  TranscriptionResponse,
} from "../types.js";

/**
 * Abstract base class for AI providers
 *
 * All providers must implement at least:
 * - chat() for chat completions
 * - embed() for embeddings
 *
 * Optional capabilities:
 * - chatStream() for streaming chat
 * - rerank() for document reranking
 * - generateImage() for image generation
 * - textToSpeech() for TTS
 * - speechToText() for STT
 */
export abstract class BaseAIProvider {
  abstract readonly name: ProviderName;
  abstract readonly displayName: string;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      ...config,
    };
  }

  // ============================================
  // Required Methods
  // ============================================

  /**
   * Create a chat completion
   */
  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Create embeddings for text
   */
  abstract embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  // ============================================
  // Optional Methods (with default implementations)
  // ============================================

  /**
   * Stream a chat completion
   */
  async *chatStream(
    _request: ChatCompletionRequest,
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    throw new Error(`Streaming not supported by ${this.name}`);
    // biome-ignore lint/correctness/noUnreachable: required for TS generator type inference
    yield undefined as never;
  }

  /**
   * Rerank documents by relevance to a query
   */
  async rerank(_request: RerankRequest): Promise<RerankResponse> {
    throw new Error(`Reranking not supported by ${this.name}`);
  }

  /**
   * Generate images from text prompts
   */
  async generateImage(_request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    throw new Error(`Image generation not supported by ${this.name}`);
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(_request: TextToSpeechRequest): Promise<ArrayBuffer> {
    throw new Error(`Text-to-speech not supported by ${this.name}`);
  }

  /**
   * Convert speech to text
   */
  async speechToText(_request: SpeechToTextRequest): Promise<TranscriptionResponse> {
    throw new Error(`Speech-to-text not supported by ${this.name}`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if provider supports a specific capability
   */
  supportsCapability(_capability: ProviderCapability): boolean {
    return false;
  }

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): ProviderModel[];

  /**
   * Validate API key format (basic validation)
   */
  protected validateApiKey(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === "") {
      throw new Error(`API key is required for ${this.name}`);
    }
  }
}

// ============================================
// Provider Capability Types
// ============================================

export type ProviderCapability =
  | "chat"
  | "chat-stream"
  | "embeddings"
  | "rerank"
  | "image-generation"
  | "text-to-speech"
  | "speech-to-text"
  | "video-generation"
  | "function-calling"
  | "vision"
  | "reasoning"; // For models like DeepSeek-R1

export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  capabilities: ProviderCapability[];
  contextWindow?: number;
  maxOutputTokens?: number;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
}

// ============================================
// Provider Factory
// ============================================

export type ProviderFactory = (config: ProviderConfig) => BaseAIProvider;

const providerRegistry = new Map<ProviderName, ProviderFactory>();

export function registerProvider(name: ProviderName, factory: ProviderFactory): void {
  providerRegistry.set(name, factory);
}

export function createProvider(name: ProviderName, config: ProviderConfig): BaseAIProvider {
  const factory = providerRegistry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown provider: ${name}. Available: ${[...providerRegistry.keys()].join(", ")}`,
    );
  }
  return factory(config);
}

export function getRegisteredProviders(): ProviderName[] {
  return [...providerRegistry.keys()];
}
