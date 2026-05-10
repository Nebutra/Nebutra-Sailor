/**
 * Vercel AI SDK agent adapter.
 *
 * Uses `streamText` from the `ai` package with tool-loop support.
 * The `ai` peer dependency is dynamically imported so the package
 * doesn't fail at require-time when the SDK is absent.
 */

import { BaseAgent } from "../agent";
import { withAnthropicCacheControl } from "../fallback";
import { buildTelemetryConfig } from "../observability";
import type { AgentContext, AgentMessage, AgentResponse } from "../types";

export class VercelAIAgent extends BaseAgent {
  protected override async execute(
    messages: readonly AgentMessage[],
    context: AgentContext,
  ): Promise<AgentResponse> {
    // Dynamic import — avoids hard dependency on `ai`
    const { streamText, stepCountIs, dynamicTool } = await import("ai");

    type StreamTextParams = Parameters<typeof streamText>[0];

    // Build AI SDK tool definitions from our AgentTool interface.
    // We use dynamicTool() because our AgentTool uses a loose JSON Schema
    // record type rather than a typed Zod schema.
    const toolSet: StreamTextParams["tools"] = this.config.tools
      ? Object.fromEntries(
          this.config.tools.map((t) => [
            t.name,
            dynamicTool({
              description: t.description,
              inputSchema: t.inputSchema as Parameters<typeof dynamicTool>[0]["inputSchema"],
              execute: async (args) => t.execute(args, context),
            }),
          ]),
        )
      : undefined;

    // Build streamText options, conditionally including tools to satisfy
    // exactOptionalPropertyTypes (tools must not be `undefined`).
    //
    // Cost optimization: stable content (system prompt + tool defs) is placed
    // FIRST and dynamic content (user messages) LAST. This ordering is required
    // for both Anthropic explicit prompt caching (90% discount via `cacheControl`)
    // and OpenAI automatic caching (≥1024 token stable prefix). Reordering or
    // mutating the system prompt invalidates the cache on every call.
    const telemetry = buildTelemetryConfig({
      functionId: `agent.${this.config.id}`,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        sessionId: context.conversationId,
        agentId: this.config.id,
      },
    });

    const baseOptions = {
      model: this.config.model as unknown as StreamTextParams["model"],
      system: this.config.instructions,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      stopWhen: stepCountIs(this.config.maxSteps ?? 20),
      // Anthropic prompt cache control on the system message — 90% cost
      // reduction on cached prefix tokens. No-op for non-Anthropic providers.
      providerOptions: withAnthropicCacheControl(),
      experimental_telemetry: telemetry,
    } as StreamTextParams;

    const streamOptions: StreamTextParams =
      toolSet !== undefined ? { ...baseOptions, tools: toolSet } : baseOptions;

    const result = streamText(streamOptions);

    // Consume the stream to get the final result
    const text = await result.text;
    const usage = await result.usage;

    // AI SDK v6 uses inputTokens/outputTokens on LanguageModelUsage
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;

    const responseMessages: AgentMessage[] = [
      ...messages,
      { role: "assistant" as const, content: text, timestamp: new Date() },
    ];

    return {
      messages: responseMessages,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      finishReason: "stop",
      agentId: this.config.id,
    };
  }
}
