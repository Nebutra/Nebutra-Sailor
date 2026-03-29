/**
 * Vercel AI SDK agent adapter.
 *
 * Uses `streamText` from the `ai` package with tool-loop support.
 * The `ai` peer dependency is dynamically imported so the package
 * doesn't fail at require-time when the SDK is absent.
 */

import { BaseAgent } from "../agent.js";
import type { AgentContext, AgentMessage, AgentResponse } from "../types.js";

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
    const baseOptions = {
      model: this.config.model as unknown as StreamTextParams["model"],
      system: this.config.instructions,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      stopWhen: stepCountIs(this.config.maxSteps ?? 20),
    };

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
