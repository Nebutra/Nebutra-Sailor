// ─── Core ─────────────────────────────────────────────────────────────────────
export { BaseAgent } from "./agent.js";
// ─── Memory ───────────────────────────────────────────────────────────────────
export { clearMemory, getMemory, saveMemory } from "./memory.js";
export { AgentOrchestrator } from "./orchestrator.js";
export { AgentRouter } from "./router.js";

// ─── Tenant ───────────────────────────────────────────────────────────────────
export { checkAgentQuota, createAgentContext } from "./tenant.js";

// ─── Tools ────────────────────────────────────────────────────────────────────
export {
  BUILT_IN_TOOLS,
  databaseQueryTool,
  knowledgeBaseTool,
  webSearchTool,
} from "./tools.js";

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
} from "./types.js";

// ─── Vercel AI SDK helpers (absorbed from @nebutra/ai-sdk) ───────────────────
// Top-level generation, streaming and embedding helpers that wrap the Vercel
// AI SDK (`ai` package) with a single configure()-driven provider resolver.
export {
  configure,
  createEmbeddingModel,
  createModel,
  embed,
  embedMany,
  type EmbedOptions,
  generateText,
  type GenerateOptions,
  type GenerateTextResult,
  getConfig,
  type ModelMessage,
  type ModelPreset,
  models,
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  type ProviderType,
  type ResolvedNebutraAIConfig,
  resolveModel,
  streamText,
  type StreamTextResult,
} from "./sdk/index.js";
