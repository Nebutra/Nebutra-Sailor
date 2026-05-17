/**
 * @nebutra/atelier-agent — creative-canvas agent.
 *
 * Composes the absorbed creative-direction prompt strategy with one
 * generation tool that places assets on a tenant-scoped canvas. Brings no
 * orchestration of its own: it produces an `AgentConfig` consumed by
 * `@nebutra/agents` (BaseAgent / orchestrator).
 */

export { type CreateAtelierAgentOptions, createAtelierAgent } from "./agent";
export {
  ATELIER_CREATOR_RULES,
  ATELIER_PLANNER_RULES,
  ATELIER_SYSTEM_PROMPT,
} from "./prompts";
export { type AtelierToolDeps, createAtelierGenerationTool } from "./tools";
