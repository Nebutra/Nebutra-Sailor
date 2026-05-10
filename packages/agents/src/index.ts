// ─── Core ─────────────────────────────────────────────────────────────────────
export { BaseAgent } from "./agent";
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
  type FallbackResult,
  isRetryableError,
  runWithFallback,
  withAnthropicCacheControl,
} from "./fallback";
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
  configure,
  createEmbeddingModel,
  createModel,
  type EmbedOptions,
  embed,
  embedMany,
  type GenerateOptions,
  type GenerateTextResult,
  generateText,
  getConfig,
  type ModelMessage,
  type ModelPreset,
  models,
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  type ProviderType,
  type ResolvedNebutraAIConfig,
  resolveModel,
  type StreamTextResult,
  streamText,
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
  PipelineStep,
  RouterConfig,
  TokenUsage,
  ToolCallResult,
} from "./types";
