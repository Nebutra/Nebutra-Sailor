import { logger } from "@nebutra/logger";
import type { AgentConfig, AgentContext, AgentRun, TokenUsage } from "./types.js";

/**
 * Execute an agent run with multi-tenant isolation, token tracking, and usage metering.
 * This wraps Vercel AI SDK's generateText with tenant context.
 */
export async function runAgent(
  config: AgentConfig,
  prompt: string,
  context: AgentContext,
): Promise<AgentRun> {
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  logger.info("Agent run started", {
    runId,
    agentId: config.id,
    tenantId: context.tenantId,
    model: config.model,
  });

  try {
    // Dynamic import to avoid bundling AI SDK in non-AI contexts
    const { generateText, stepCountIs } = await import("ai");

    const generateOptions: Parameters<typeof generateText>[0] = {
      model: config.model as Parameters<typeof generateText>[0]["model"],
      system: config.instructions,
      prompt,
      tools: config.tools as Record<string, never>,
      stopWhen: stepCountIs(config.maxSteps ?? 10),
      providerOptions: {
        gateway: {
          user: context.userId,
          tags: [`tenant:${context.tenantId}`, `agent:${config.id}`],
        },
      },
    };

    if (context.signal) {
      generateOptions.abortSignal = context.signal;
    }

    const result = await generateText(generateOptions);

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    const tokenUsage: TokenUsage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: estimateCost(config.model, {
        inputTokens,
        outputTokens,
      }),
    };

    const run: AgentRun = {
      id: runId,
      agentId: config.id,
      tenantId: context.tenantId,
      userId: context.userId,
      status: "completed",
      messages: [
        { role: "user", content: prompt, timestamp: startedAt },
        { role: "assistant", content: result.text, timestamp: new Date() },
      ],
      tokenUsage,
      startedAt,
      completedAt: new Date(),
    };

    logger.info("Agent run completed", {
      runId,
      agentId: config.id,
      tenantId: context.tenantId,
      tokens: tokenUsage.totalTokens,
      cost: tokenUsage.estimatedCost,
    });

    return run;
  } catch (error) {
    const run: AgentRun = {
      id: runId,
      agentId: config.id,
      tenantId: context.tenantId,
      userId: context.userId,
      status: context.signal?.aborted ? "cancelled" : "failed",
      messages: [{ role: "user", content: prompt, timestamp: startedAt }],
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
      startedAt,
      completedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
    };

    logger.error("Agent run failed", { runId, error: run.error });
    return run;
  }
}

/** Rough cost estimation per model */
function estimateCost(
  model: string,
  usage?: { inputTokens?: number; outputTokens?: number },
): number {
  if (!usage) return 0;
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;

  // Cost per 1M tokens (approximate pricing)
  const pricing: Record<string, { input: number; output: number }> = {
    "openai/gpt-5.4": { input: 2.5, output: 10 },
    "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
    "google/gemini-3.1-flash": { input: 0.075, output: 0.3 },
  };

  const rates = pricing[model] ?? { input: 1, output: 3 };
  return (input * rates.input + output * rates.output) / 1_000_000;
}
