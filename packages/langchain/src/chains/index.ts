import { logger } from "@nebutra/logger";

export interface ChainStep {
  name: string;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Simple sequential chain runner.
 * For complex chains, use LangChain's native LCEL (LangChain Expression Language).
 */
export async function runSequentialChain(
  steps: ChainStep[],
  initialInput: Record<string, unknown>,
  context?: { tenantId?: string },
): Promise<Record<string, unknown>> {
  let current = { ...initialInput };

  for (const step of steps) {
    logger.info("Chain step executing", {
      step: step.name,
      tenantId: context?.tenantId,
    });
    current = await step.execute(current);
  }

  return current;
}

/**
 * Create a summarization chain step.
 */
export function createSummarizeStep(model?: string): ChainStep {
  return {
    name: "summarize",
    async execute(input) {
      const { generateText } = await import("ai");
      const text = String(input["text"] ?? "");
      const result = await generateText({
        model: model ?? ("openai/gpt-4o" as unknown as Parameters<typeof generateText>[0]["model"]),
        prompt: `Summarize the following text concisely:\n\n${text}`,
      });
      return { ...input, summary: result.text };
    },
  };
}

/**
 * Create a classification chain step.
 */
export function createClassifyStep(categories: string[], model?: string): ChainStep {
  return {
    name: "classify",
    async execute(input) {
      const { generateText } = await import("ai");
      const { z } = await import("zod");
      const text = String(input["text"] ?? "");
      const schema = z.object({
        category: z.enum(categories as [string, ...string[]]),
        confidence: z.number().min(0).max(1),
      });
      const result = await generateText({
        model: model ?? ("openai/gpt-4o" as unknown as Parameters<typeof generateText>[0]["model"]),
        prompt: `Classify this text into one of: ${categories.join(", ")}\n\nText: ${text}`,
        experimental_output: schema as never,
      });
      return { ...input, classification: result.text };
    },
  };
}
