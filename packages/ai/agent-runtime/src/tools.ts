/**
 * Tool / MCP abstraction (WRAP — capability #9).
 *
 * Faithful re-expression of the upstream uniform tool model: one
 * `ToolDefinition` interface, JSON-schema in/out, a deferred-load flag, and
 * MCP-as-adapter behind the same interface (MCP tools and native tools are
 * indistinguishable at dispatch). Activates `@nebutra/mcp` primitives rather
 * than re-porting them.
 */

import type { z } from "zod";

/** A tool definition — pure data; transport-agnostic. */
export interface ToolDefinition<I = unknown, O = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<I>;
  readonly outputSchema?: z.ZodType<O>;
  /**
   * When true, the full schema is withheld until a `tool_search` discovery
   * step lazily loads it (parity with the upstream deferred-tool pattern).
   */
  readonly deferLoading?: boolean;
}

/** Source provenance — native vs. adapted from an MCP server. */
export type ToolOrigin =
  | { readonly kind: "native" }
  | { readonly kind: "mcp"; readonly server: string };

export interface RegisteredTool {
  readonly definition: ToolDefinition;
  readonly origin: ToolOrigin;
}

/** A tool invocation routed through the registry. */
export interface ToolDispatchContext {
  /** Mandatory tenant scope — every dispatch is tenant-bound. */
  readonly tenantId: string;
  readonly threadId: string;
}

export type ToolHandler<I = unknown, O = unknown> = (
  input: I,
  ctx: ToolDispatchContext,
) => Promise<O>;

/** Pre/post dispatch hooks (parity with upstream orchestrator hooks). */
export interface ToolHooks {
  readonly preToolUse?: (name: string, input: unknown, ctx: ToolDispatchContext) => Promise<void>;
  readonly postToolUse?: (name: string, output: unknown, ctx: ToolDispatchContext) => Promise<void>;
}

/**
 * registry -> router -> orchestrator pipeline. MCP tools register via
 * {@link adaptMcpTool} and are dispatched identically to native tools.
 */
export class ToolRegistry {
  readonly #tools = new Map<string, { reg: RegisteredTool; handler: ToolHandler }>();
  readonly #hooks: ToolHooks;

  constructor(hooks: ToolHooks = {}) {
    this.#hooks = hooks;
  }

  register<I, O>(
    definition: ToolDefinition<I, O>,
    handler: ToolHandler<I, O>,
    origin: ToolOrigin = { kind: "native" },
  ): void {
    if (this.#tools.has(definition.name)) {
      throw new Error(`Tool already registered: ${definition.name}`);
    }
    this.#tools.set(definition.name, {
      reg: { definition: definition as ToolDefinition, origin },
      handler: handler as ToolHandler,
    });
  }

  list(): readonly RegisteredTool[] {
    return [...this.#tools.values()].map((e) => e.reg);
  }

  async dispatch(name: string, rawInput: unknown, ctx: ToolDispatchContext): Promise<unknown> {
    const entry = this.#tools.get(name);
    if (!entry) throw new Error(`Unknown tool: ${name}`);
    const input = entry.reg.definition.inputSchema.parse(rawInput);
    await this.#hooks.preToolUse?.(name, input, ctx);
    const output = await entry.handler(input, ctx);
    const validated = entry.reg.definition.outputSchema
      ? entry.reg.definition.outputSchema.parse(output)
      : output;
    await this.#hooks.postToolUse?.(name, validated, ctx);
    return validated;
  }
}

/** Minimal shape of an MCP client (satisfied by `@nebutra/mcp`'s `mcpClient`). */
export interface McpClientLike {
  executeTool(
    name: string,
    args: unknown,
    ctx: { requestId: string; tenantId: string },
  ): Promise<unknown>;
}

/**
 * Adapt an external MCP tool into the uniform tool model. The resulting
 * handler delegates to the MCP client; callers cannot tell it apart from a
 * native tool.
 */
export function adaptMcpTool(
  server: string,
  definition: ToolDefinition,
  client: McpClientLike,
): { definition: ToolDefinition; handler: ToolHandler; origin: ToolOrigin } {
  return {
    definition,
    origin: { kind: "mcp", server },
    handler: async (input, ctx) =>
      client.executeTool(definition.name, input, {
        requestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
        tenantId: ctx.tenantId,
      }),
  };
}
