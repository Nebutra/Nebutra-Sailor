/**
 * AgentOrchestrator — multi-agent coordination engine.
 *
 * Supports three execution modes:
 *   - chat(): route a single message to the best agent
 *   - pipeline(): chain agents sequentially (output → next input)
 *   - broadcast(): fan-out to all agents and collect results
 */

import { logger } from "@nebutra/logger";
import { BaseAgent } from "./agent";
import { AgentRouter } from "./router";
import { checkAgentQuota } from "./tenant";
import type {
  AgentContext,
  AgentMessage,
  AgentResponse,
  OrchestratorConfig,
  PipelineStep,
} from "./types";

export class AgentOrchestrator {
  private readonly agents: Map<string, BaseAgent>;
  private readonly router: AgentRouter;
  private readonly defaultAgentId: string | undefined;

  constructor(config: OrchestratorConfig) {
    this.agents = new Map();
    this.defaultAgentId = config.defaultAgentId;

    // Register agents — callers provide AgentConfig[], we wrap in BaseAgent
    // In practice, callers will register concrete subclasses (VercelAIAgent, etc.)
    for (const agentConfig of config.agents) {
      this.agents.set(agentConfig.id, new BaseAgent(agentConfig));
    }

    // Set up router
    this.router = new AgentRouter(config.router ?? { strategy: "keyword" });
  }

  /**
   * Register a pre-built agent instance (e.g. VercelAIAgent).
   * Overwrites any agent with the same ID.
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.config.id, agent);
  }

  /**
   * Get a registered agent by ID.
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Route a message to the best agent and execute.
   */
  async chat(message: string, context: AgentContext): Promise<AgentResponse> {
    await this.assertQuota(context.tenantId);

    const agentConfigs = [...this.agents.values()].map((a) => a.config);
    const agentId = await this.router.route(message, agentConfigs, context, this.defaultAgentId);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in orchestrator`);
    }

    const messages: AgentMessage[] = [{ role: "user", content: message, timestamp: new Date() }];

    return agent.run(messages, context);
  }

  /**
   * Execute a multi-agent pipeline where each step's output feeds the next.
   * @experimental — API may change. Use `chat()` for production workloads.
   */
  async pipeline(
    steps: readonly PipelineStep[],
    input: string,
    context: AgentContext,
  ): Promise<AgentResponse> {
    await this.assertQuota(context.tenantId);

    let currentInput = input;
    let lastResponse: AgentResponse | undefined;

    for (const step of steps) {
      const agent = this.agents.get(step.agentId);
      if (!agent) {
        throw new Error(`Pipeline step references unknown agent "${step.agentId}"`);
      }

      const transformedInput = step.transformInput
        ? step.transformInput(currentInput)
        : currentInput;

      const messages: AgentMessage[] = [
        { role: "user", content: transformedInput, timestamp: new Date() },
      ];

      lastResponse = await agent.run(messages, context);

      // Extract the last assistant message as input for the next step
      const assistantMessages = lastResponse.messages.filter((m) => m.role === "assistant");
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      currentInput = lastAssistant?.content ?? "";

      logger.info("Pipeline step completed", {
        agentId: step.agentId,
        tenantId: context.tenantId,
      });
    }

    if (!lastResponse) {
      throw new Error("Pipeline produced no response (empty steps?)");
    }

    return lastResponse;
  }

  /**
   * Broadcast a message to ALL registered agents in parallel.
   * Returns an array of responses (one per agent).
   * @experimental — API may change. Use `chat()` for production workloads.
   */
  async broadcast(message: string, context: AgentContext): Promise<readonly AgentResponse[]> {
    await this.assertQuota(context.tenantId);

    const messages: AgentMessage[] = [{ role: "user", content: message, timestamp: new Date() }];

    const promises = [...this.agents.values()].map((agent) => agent.run(messages, context));

    return Promise.all(promises);
  }

  /**
   * Check tenant quota before execution.
   */
  private async assertQuota(tenantId: string): Promise<void> {
    const { allowed } = await checkAgentQuota(tenantId);
    if (!allowed) {
      throw new Error(`Tenant "${tenantId}" has exceeded agent execution quota`);
    }
  }
}
