/**
 * @nebutra/atelier-canvas/agent — the canvas capability's agent face.
 *
 * Opt-in subpath: importing it pulls `@nebutra/agents` (an optional peer);
 * the package's core export (placement / store / consistency) stays free of
 * any agents dependency. This is a *consumer* of the agents runtime — it
 * yields an `AgentConfig` — never a runtime parallel to it.
 */

export { type CreateAtelierAgentOptions, createAtelierAgent } from "./agent";
export {
  ATELIER_CREATOR_RULES,
  ATELIER_PLANNER_RULES,
  ATELIER_SYSTEM_PROMPT,
} from "./prompts";
export { type AtelierToolDeps, createAtelierGenerationTool } from "./tools";
