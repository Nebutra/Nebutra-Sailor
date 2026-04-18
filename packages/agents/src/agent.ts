/**
 * BaseAgent — abstract agent with memory, usage tracking, and tenant scoping.
 *
 * Concrete agents (VercelAIAgent, LangChainAgent, etc.) extend this class
 * and implement the `execute()` method for their specific SDK.
 */

import { logger } from "@nebutra/logger";
import { getMemory, saveMemory } from "./memory";
import type {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentUsageEvent,
} from "./types";

export class BaseAgent {
  public readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Run the agent with full lifecycle:
   * 1. Load long-term memory (if configured)
   * 2. Trim to short-term window
   * 3. Delegate to provider-specific `execute()`
   * 4. Track usage for billing
   * 5. Persist new messages to memory
   */
  async run(messages: readonly AgentMessage[], context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    // Load long-term memory when enabled
    const memory = this.config.memory?.longTerm?.enabled
      ? await getMemory(context.tenantId, context.conversationId)
      : [];

    // Merge and trim to short-term window
    const maxMessages = this.config.memory?.shortTerm?.maxMessages ?? 50;
    const allMessages = [...memory, ...messages].slice(-maxMessages);

    // Provider-specific execution
    const response = await this.execute(allMessages, context);

    const durationMs = Date.now() - startTime;

    // Build usage event for billing / metering
    const usage: AgentUsageEvent = {
      tenantId: context.tenantId,
      userId: context.userId,
      agentId: this.config.id,
      model: this.config.model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      durationMs,
      timestamp: new Date(),
    };

    logger.info("Agent execution completed", {
      agentId: this.config.id,
      tenantId: context.tenantId,
      tokens: usage.totalTokens,
      durationMs,
    });

    // Persist to long-term memory
    if (this.config.memory?.longTerm?.enabled) {
      await saveMemory(context.tenantId, context.conversationId, response.messages);
    }

    // Await usage emission so billing deduction is tracked before returning
    await this.emitUsage(usage);

    return response;
  }

  /**
   * Provider-specific execution. Subclasses MUST override this.
   */
  protected async execute(
    _messages: readonly AgentMessage[],
    _context: AgentContext,
  ): Promise<AgentResponse> {
    throw new Error("execute() must be implemented by provider adapter");
  }

  /**
   * Emit a usage event for downstream billing / metering.
   */
  private async emitUsage(event: AgentUsageEvent): Promise<void> {
    try {
      const { deductCredits } = await import("@nebutra/billing/credits");

      // Basic credit consumption: 1 credit per 10k total tokens
      const totalTokens = event.totalTokens || 0;
      if (totalTokens === 0) return;

      const creditCost = Math.max(1, Math.ceil(totalTokens / 10000));

      await deductCredits({
        organizationId: event.tenantId,
        amount: creditCost,
        description: `Agent execution: ${event.model}`,
      });
    } catch (err) {
      logger.error("Failed to emit usage or deduct credits for agent execution", {
        tenantId: event.tenantId,
        agentId: event.agentId,
        error: err,
      });
    }
  }
}
