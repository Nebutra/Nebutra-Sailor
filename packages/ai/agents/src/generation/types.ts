/**
 * Image / video generation modality for `@nebutra/agents`.
 *
 * The text + embedding modalities wrap the Vercel AI SDK. Image / video
 * generation is a *new modality on the same provider layer*: providers are
 * env-key gated exactly like the LLM fallback chain (see `fallback.ts`), so
 * single-provider — or zero-provider (mock) — deploys just work.
 *
 * Generation is tenant-scoped: every call carries a {@link GenerationContext}
 * so downstream metering / audit can attribute units to an organization.
 */

/** What a provider can produce. */
export type GenerationModality = "image" | "video";

/** Tenant-scoped attribution for a generation call (mirrors AgentContext). */
export interface GenerationContext {
  readonly tenantId: string;
  readonly userId: string;
  /** Optional logical grouping (e.g. a canvas / conversation id). */
  readonly conversationId?: string;
}

export interface ImageGenerationRequest {
  readonly prompt: string;
  /** Pixel width — defaults to 1024. */
  readonly width?: number;
  /** Pixel height — defaults to 1024. */
  readonly height?: number;
  /** Optional model id / preset; provider-specific passthrough. */
  readonly model?: string;
  /** Reference images (data: URI or URL) for edit / variation flows. */
  readonly inputImages?: readonly string[];
}

export interface VideoGenerationRequest {
  readonly prompt: string;
  /** Clip length in seconds — defaults to 5. */
  readonly durationSeconds?: number;
  readonly width?: number;
  readonly height?: number;
  readonly model?: string;
  /** Optional first-frame image (data: URI or URL). */
  readonly inputImage?: string;
}

export interface GenerationResult {
  readonly modality: GenerationModality;
  /** e.g. "image/svg+xml", "image/png", "video/mp4". */
  readonly mimeType: string;
  /** `data:` URI (mock / inline) or a remote URL the caller can fetch. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Provider that actually produced the asset. */
  readonly providerName: string;
  /** Model id reported by the provider. */
  readonly model: string;
  /**
   * Best-effort billable units for `@nebutra/metering` (e.g. 1 image,
   * N seconds of video). Callers decide the meter mapping.
   */
  readonly usage: { readonly units: number };
}

/**
 * A generation backend. `envKey` mirrors the LLM provider gating: when the
 * variable is absent the provider is filtered out of the chain. `null` means
 * "always available" — reserved for the deterministic mock provider so CI and
 * flag-gated demos never need a paid secret.
 */
export interface GenerationProvider {
  readonly name: string;
  readonly envKey: string | null;
  readonly capabilities: readonly GenerationModality[];
  generateImage?(req: ImageGenerationRequest, ctx: GenerationContext): Promise<GenerationResult>;
  generateVideo?(req: VideoGenerationRequest, ctx: GenerationContext): Promise<GenerationResult>;
}

export interface GenerationCallOptions {
  /**
   * Ordered provider-name preference. Unknown / unavailable names are skipped.
   * Defaults to `GENERATION_FALLBACK_CHAIN` env (comma-separated) then registry
   * order, always ending at `mock` so a result is guaranteed.
   */
  readonly chain?: readonly string[];
}
