/**
 * AgentRouter — routes incoming messages to the appropriate agent.
 *
 * Strategies:
 *   - keyword: fast, pattern-based matching against agent descriptions
 *   - llm: uses a small model to classify intent (requires AI SDK)
 *   - custom: user-supplied routing function
 */

import { logger } from "@nebutra/logger";
import type { AgentConfig, AgentContext, RouterConfig } from "./types.js";

export class AgentRouter {
  private readonly config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  /**
   * Route a message to the best-matching agent.
   * Returns the agent ID.
   */
  async route(
    message: string,
    agents: readonly AgentConfig[],
    context: AgentContext,
    defaultAgentId?: string,
  ): Promise<string> {
    if (agents.length === 0) {
      throw new Error("No agents configured in the orchestrator");
    }

    switch (this.config.strategy) {
      case "keyword":
        return this.routeByKeyword(message, agents, defaultAgentId);
      case "llm":
        return this.routeByLLM(message, agents, defaultAgentId);
      case "custom":
        return this.routeByCustom(message, context, defaultAgentId);
      default: {
        const _exhaustive: never = this.config.strategy;
        throw new Error(`Unknown routing strategy: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * Keyword-based routing: score each agent by how many words from
   * its name + description appear in the user message.
   */
  private routeByKeyword(
    message: string,
    agents: readonly AgentConfig[],
    defaultAgentId?: string,
  ): string {
    const messageLower = message.toLowerCase();
    let bestId = defaultAgentId ?? agents[0]!.id;
    let bestScore = 0;

    for (const agent of agents) {
      const keywords = `${agent.name} ${agent.description}`.toLowerCase().split(/\s+/);

      let score = 0;
      for (const keyword of keywords) {
        if (keyword.length > 2 && messageLower.includes(keyword)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = agent.id;
      }
    }

    logger.info("Router: keyword match", {
      selectedAgentId: bestId,
      score: bestScore,
    });
    return bestId;
  }

  /**
   * LLM-based routing: uses a small model to classify the user's intent
   * and select the best agent. Falls back to keyword if AI SDK unavailable.
   */
  private async routeByLLM(
    message: string,
    agents: readonly AgentConfig[],
    defaultAgentId?: string,
  ): Promise<string> {
    try {
      const { generateText } = await import("ai");

      const agentList = agents.map((a) => `- ${a.id}: ${a.description}`).join("\n");

      const result = await generateText({
        model: agents[0]!.model as unknown as Parameters<typeof generateText>[0]["model"],
        system: [
          "You are a routing classifier. Given a user message and a list of agents,",
          "respond with ONLY the agent ID that best matches the user's intent.",
          "If no agent is a good match, respond with the default agent ID.",
          "",
          `Available agents:\n${agentList}`,
          "",
          defaultAgentId ? `Default agent: ${defaultAgentId}` : "",
        ].join("\n"),
        prompt: message,
      });

      const selectedId = result.text.trim();
      const validAgent = agents.find((a) => a.id === selectedId);

      if (validAgent) {
        logger.info("Router: LLM classification", {
          selectedAgentId: validAgent.id,
        });
        return validAgent.id;
      }

      // LLM returned an invalid ID — fall back
      return defaultAgentId ?? agents[0]!.id;
    } catch (error) {
      logger.warn("Router: LLM routing failed, falling back to keyword", {
        error,
      });
      return this.routeByKeyword(message, agents, defaultAgentId);
    }
  }

  /**
   * Custom routing via user-supplied function.
   */
  private async routeByCustom(
    message: string,
    context: AgentContext,
    defaultAgentId?: string,
  ): Promise<string> {
    if (!this.config.customRouter) {
      throw new Error(
        'RouterConfig strategy is "custom" but no customRouter function was provided',
      );
    }

    try {
      return await this.config.customRouter(message, context);
    } catch (error) {
      logger.warn("Router: custom router failed", { error });
      if (defaultAgentId) return defaultAgentId;
      throw error;
    }
  }
}
