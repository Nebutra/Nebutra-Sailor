/**
 * The creative-canvas agent, as a single Sailor `AgentConfig`.
 *
 * The source product ran a two-node LangGraph swarm (planner ⇄ creator). Both
 * roles are expressed here as one prompt with two phases plus one tool — the
 * planner/creator split was orchestration overhead, not product value, and
 * Sailor's `BaseAgent` tool-loop already provides the step iteration the swarm
 * was emulating. `maxSteps` is the `@nebutra/agents` AgentConfig field (the
 * provider maps it to `stopWhen: stepCountIs(...)` internally) — not an AI SDK
 * option.
 */

import type { AgentConfig } from "@nebutra/agents";
import { ATELIER_SYSTEM_PROMPT } from "./prompts";
import { type AtelierToolDeps, createAtelierGenerationTool } from "./tools";

export interface CreateAtelierAgentOptions extends AtelierToolDeps {
  /** Model id / preset. Defaults to the "flagship" preset. */
  readonly model?: string;
  /** Max tool-loop iterations (batch generation needs headroom). */
  readonly maxSteps?: number;
}

export function createAtelierAgent(opts: CreateAtelierAgentOptions): AgentConfig {
  return {
    id: "atelier",
    name: "Atelier",
    description: "Plans and generates images/videos onto a creative canvas from a brief.",
    model: opts.model ?? "flagship",
    instructions: ATELIER_SYSTEM_PROMPT,
    tools: [createAtelierGenerationTool(opts)],
    maxSteps: opts.maxSteps ?? 30,
  };
}
