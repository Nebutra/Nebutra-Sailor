/**
 * Structured generation — the JSON-Schema → forced-tool bridge.
 *
 * AI SDK v6 removed `generateObject`. To get a schema-shaped object we force a
 * single `_output` tool whose `inputSchema` IS the caller's JSON Schema, then
 * AJV-recheck the model's tool-call args (defense in depth — the provider's
 * structured output should already match, but tenants supply the schema). The
 * call goes through the same provider fallback chain as every other generation.
 */

import { generateText as _generateText, jsonSchema, type ModelMessage, tool } from "ai";
import Ajv from "ajv";
import { runWithFallback } from "../fallback";
import { assertSafeOpenAIJsonPayload } from "./payload-guard";

export interface GenerateStructuredResult {
  /** The object the model produced — already validated against the schema. */
  readonly output: unknown;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly reasoningOutputTokens: number;
  };
}

// strict:false — tenant-authored schemas may use keywords AJV's strict mode
// rejects (e.g. unknown formats); we validate shape, not author hygiene.
const ajv = new Ajv({ allErrors: true, strict: false });

/** Validate a value against a JSON Schema. Throws with a readable message. */
export function validateStructured(value: unknown, schema: Record<string, unknown>): void {
  const validate = ajv.compile(schema);
  if (!validate(value)) {
    throw new Error(
      `structured output failed schema validation: ${ajv.errorsText(validate.errors)}`,
    );
  }
}

export async function generateStructured(
  messages: ModelMessage[],
  schema: Record<string, unknown>,
  options: { model?: string } = {},
): Promise<GenerateStructuredResult> {
  assertSafeOpenAIJsonPayload("OpenAI structured request messages", messages);
  assertSafeOpenAIJsonPayload("OpenAI structured output schema", schema);

  const { result } = await runWithFallback(
    (model) =>
      _generateText({
        model,
        messages,
        tools: {
          _output: tool({
            description: "Return the final result as a structured object matching the schema.",
            inputSchema: jsonSchema(schema),
          }),
        },
        toolChoice: { type: "tool", toolName: "_output" },
      }),
    { model: options.model ?? "flagship" },
  );

  const call = result.toolCalls?.find((c) => c.toolName === "_output");
  const output = (call?.input as unknown) ?? null;
  validateStructured(output, schema);

  const usage = result.usage;
  return {
    output,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      reasoningOutputTokens: usage?.reasoningTokens ?? 0,
    },
  };
}
