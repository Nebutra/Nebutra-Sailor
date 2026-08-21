// ─── Core ─────────────────────────────────────────────────────────────────────
export { BaseAgent } from "./agent";
// ─── User context (personalization) ───────────────────────────────────────────
export {
  buildPersonalizedSystemPrompt,
  renderUserContextBlock,
  type UserContext,
} from "./context";
// ─── Env / Observability / Fallback ─────────────────────────────────────────
export {
  type AgentsEnv,
  AgentsEnvSchema,
  type FallbackProviderName,
  getAgentsEnv,
  isLangfuseConfigured,
} from "./env";
export {
  buildSystemWithCache,
  type CreateFallbackModelOptions,
  type EmbeddingFallbackOptions,
  type FallbackResult,
  filterAvailableProviders,
  isRetryableError,
  runEmbedWithFallback,
  runWithFallback,
  withAnthropicCacheControl,
} from "./fallback";
// ─── Generation (image / video modality) ─────────────────────────────────────
// New modality on the same env-key-gated provider layer as the LLM fallback
// chain. `mock` is always available so CI / flag-gated demos need no secret.
export {
  _resetGenerationRegistry,
  type GenerationCallOptions,
  type GenerationContext,
  type GenerationModality,
  type GenerationProvider,
  type GenerationResult,
  generateImage,
  generateVideo,
  type ImageGenerationRequest,
  listGenerationProviders,
  mockGenerationProvider,
  registerGenerationProvider,
  type VideoGenerationRequest,
} from "./generation/index";
// ─── Memory ───────────────────────────────────────────────────────────────────
export { clearMemory, getMemory, saveMemory } from "./memory";
export {
  buildTelemetryConfig,
  flushTelemetry,
  initLangfuse,
  type TelemetryMetadata,
} from "./observability";
export { AgentOrchestrator } from "./orchestrator";
export { AgentRouter } from "./router";
// ─── Vercel AI SDK helpers (absorbed from @nebutra/ai-sdk) ───────────────────
// Top-level generation, streaming and embedding helpers that wrap the Vercel
// AI SDK (`ai` package) with a single configure()-driven provider resolver.
export {
  assertSafeOpenAIJsonPayload,
  configure,
  createEmbeddingModel,
  createModel,
  type EmbedOptions,
  embed,
  embedMany,
  findOversizedPropertyName,
  type GenerateOptions,
  type GenerateStructuredResult,
  type GenerateTextResult,
  generateStructured,
  generateText,
  getConfig,
  type ModelMessage,
  type ModelPreset,
  models,
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  OPENAI_MAX_PROPERTY_NAME_LENGTH,
  type ProviderType,
  type ResolvedNebutraAIConfig,
  resolveModel,
  type StreamTextResult,
  streamText,
  toAi302ModelId,
  validateStructured,
} from "./sdk/index";
// ─── Tenant ───────────────────────────────────────────────────────────────────
export { checkAgentQuota, createAgentContext } from "./tenant";
// ─── Tools ────────────────────────────────────────────────────────────────────
export {
  BUILT_IN_TOOLS,
  databaseQueryTool,
  knowledgeBaseTool,
  webSearchTool,
} from "./tools";
// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentTool,
  AgentUsageEvent,
  MemoryConfig,
  OrchestratorConfig,
  RouterConfig,
  TokenUsage,
  ToolCallResult,
} from "./types";
