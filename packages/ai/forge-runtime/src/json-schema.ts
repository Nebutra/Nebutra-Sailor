import { z } from "zod";
import type { AnyForgeToolDefinition } from "./types";

/** JSON Schema object fragment describing a tool's `input` payload. */
export type ToolInputJsonSchema = Record<string, unknown>;

const FALLBACK_SCHEMA: ToolInputJsonSchema = {
  type: "object",
  additionalProperties: true,
  description: "Free-form input; see the tool page for field details.",
};

const cache = new WeakMap<object, ToolInputJsonSchema>();

/**
 * Convert a tool's Zod input schema into a JSON Schema fragment agents can read.
 *
 * `unrepresentable: "any"` keeps exotic leaves (Blob/Date/custom) from throwing —
 * a partially-typed schema is still far better for a planner than an opaque
 * `{ type: "object" }`. Anything Zod cannot express at all falls back to a
 * permissive object rather than breaking catalog generation.
 */
export function toolInputJsonSchema(
  schema: z.ZodType<unknown>,
  options?: { readonly target?: "draft-2020-12" | "draft-7" },
): ToolInputJsonSchema {
  const cached = cache.get(schema as unknown as object);
  if (cached && !options) return cached;

  let result: ToolInputJsonSchema;
  try {
    // `$schema` is dropped: these fragments are embedded inside OpenAPI
    // operations and MCP descriptors, never served as standalone documents.
    const { $schema: _dialect, ...rest } = z.toJSONSchema(schema, {
      target: options?.target ?? "draft-2020-12",
      io: "input",
      unrepresentable: "any",
      cycles: "ref",
      reused: "inline",
    }) as ToolInputJsonSchema;
    result = rest;
  } catch {
    result = FALLBACK_SCHEMA;
  }

  if (!options) cache.set(schema as unknown as object, result);
  return result;
}

/** JSON Schema for the full invoke request body (`{ input, requestId?, tenantId? }`). */
export function toolRequestBodyJsonSchema(tool: AnyForgeToolDefinition): ToolInputJsonSchema {
  return {
    type: "object",
    required: ["input"],
    additionalProperties: false,
    properties: {
      input: toolInputJsonSchema(tool.inputSchema),
      requestId: { type: "string", description: "Caller-supplied idempotency / trace id." },
      tenantId: { type: "string", description: "Tenant to meter this call against." },
    },
  };
}
