/**
 * @nebutra/ai-sdk Agent Utilities
 *
 * This module provides Vercel AI SDK-specific agent helpers.
 * For the provider-agnostic agent framework, use @nebutra/agents directly.
 *
 * Architecture:
 *   @nebutra/agents         ← Provider-agnostic agent framework (BaseAgent, Orchestrator, Memory)
 *   @nebutra/agents/vercel  ← Vercel AI SDK provider adapter
 *   @nebutra/ai-sdk/agents  ← THIS MODULE: convenience re-exports + Vercel-specific utilities
 */

// Vercel AI SDK-specific utilities kept here
export { runAgent } from "./agent-runner.js";
export type { ConversationMemory } from "./memory.js";
export { createInMemoryMemory, createRedisMemory } from "./memory.js";
export { getAgent, listAgents, registerAgent, removeAgent } from "./registry.js";
// Re-export types from the canonical location
export type {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentTool,
  AgentUsageEvent,
  MemoryConfig,
  OrchestratorConfig,
} from "./types.js";
