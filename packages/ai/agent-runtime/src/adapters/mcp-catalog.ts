/**
 * MCP catalog adapter — concrete wiring of `@nebutra/mcp` into
 * `@nebutra/agent-runtime`'s injectable ports.
 *
 * `@nebutra/agent-runtime` is intentionally dependency-free: it declares the
 * `McpServerCatalogPort` / `McpClientLike` ports and an `activateMcpTools`
 * composer, but never imports `@nebutra/mcp`. This module supplies the only
 * concrete bridge so apps/backends reuse it instead of re-implementing glue.
 *
 * Invariants:
 *  - tenantId is mandatory and validated *before* any registry/client call
 *    (fail-closed): an empty/blank tenant can never enumerate or execute.
 *  - Plan/tenant gating is delegated to `MCPServerRegistry` — a tenant only
 *    ever sees the tools its plan/tenant policy permits.
 *  - MCP `parameters` are translated into a Zod `inputSchema`; a tool with no
 *    usable schema still yields a permissive, never-crashing definition.
 *  - The MCP `ToolExecutionResult` envelope is unwrapped: a non-success
 *    result throws (fail-closed) rather than leaking a falsy value upstream.
 *
 * Both factories accept an injected dependency (registry / client) and default
 * to the `@nebutra/mcp` singletons, keeping the module free of hidden globals
 * and fully unit-testable.
 */

import type { MCPContext, MCPServerRegistry, ToolExecutionResult } from "@nebutra/mcp";
import { mcpClient, serverRegistry } from "@nebutra/mcp";
import { z } from "zod";
import type { McpServerCatalogPort } from "../mcp-bridge";
import type { McpClientLike, ToolDefinition } from "../tools";

/** Narrow structural shapes — we depend on behaviour, not concrete classes. */

/** The slice of `MCPServerRegistry` the catalog port needs. */
export type McpRegistryLike = Pick<MCPServerRegistry, "getAccessibleTools">;

/** The slice of `mcpClient` the client port needs. */
export interface McpExecutorLike {
  executeTool(
    name: string,
    args: Record<string, unknown>,
    ctx: MCPContext,
  ): Promise<ToolExecutionResult>;
}

type McpParameter = {
  type?: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: unknown;
};

type McpToolShape = {
  name: string;
  description?: string;
  parameters?: Record<string, McpParameter> | undefined;
  serverId: string;
};

/** Fail-closed tenant guard — the single chokepoint for both ports. */
const tenantSchema = z
  .string({ message: "tenantId is required (fail-closed)" })
  .trim()
  .min(1, "tenantId is required (fail-closed)");

const catalogCtxSchema = z.object({
  tenantId: tenantSchema,
  plan: z.string().min(1).optional(),
});

const clientCtxSchema = z.object({
  requestId: z.string().min(1, "requestId is required"),
  tenantId: tenantSchema,
});

/** Map one MCP parameter to its Zod leaf type. Unknown → permissive. */
function paramToZod(param: McpParameter): z.ZodTypeAny {
  switch (param.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.unknown());
    case "object":
      return z.record(z.string(), z.unknown());
    default:
      return z.unknown();
  }
}

/**
 * Build a Zod `inputSchema` from an MCP tool's `parameters`. A tool with no
 * declared parameters becomes a permissive passthrough object (never throws on
 * unknown keys) so schema-less MCP tools remain dispatchable.
 */
function toInputSchema(parameters: Record<string, McpParameter> | undefined): z.ZodType {
  const entries = parameters ? Object.entries(parameters) : [];
  if (entries.length === 0) {
    return z.record(z.string(), z.unknown());
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, param] of entries) {
    let leaf = paramToZod(param);
    if (param.required !== true) {
      leaf = leaf.optional();
    }
    shape[key] = leaf;
  }
  // `passthrough` keeps unknown keys: MCP schemas are advisory, not strict.
  return z.object(shape).passthrough();
}

/** Adapt one registry tool entry into an agent-runtime `ToolDefinition`. */
function toToolDefinition(tool: McpToolShape): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description ?? tool.name,
    inputSchema: toInputSchema(tool.parameters),
  };
}

/**
 * Adapt `MCPServerRegistry`'s plan/tenant-gated tool listing into the
 * agent-runtime `McpServerCatalogPort`.
 *
 * @param registry  Defaults to `@nebutra/mcp`'s `serverRegistry` singleton;
 *                   inject a fresh `MCPServerRegistry` for tests/multi-tenant
 *                   isolation.
 */
export function createMcpServerCatalog(
  registry: McpRegistryLike = serverRegistry,
): McpServerCatalogPort {
  return {
    async listTools(ctx) {
      const scope = catalogCtxSchema.parse(ctx); // fail-closed first

      const mcpCtx: MCPContext = {
        requestId: "catalog-list",
        tenantId: scope.tenantId,
        ...(scope.plan === undefined ? {} : { plan: scope.plan }),
      };

      const tools = registry.getAccessibleTools(mcpCtx) as McpToolShape[];

      return tools.map((tool) => ({
        server: tool.serverId,
        definition: toToolDefinition(tool),
      }));
    },
  };
}

/**
 * Adapt `@nebutra/mcp`'s `mcpClient` into agent-runtime's `McpClientLike`.
 *
 * Maps `{ requestId, tenantId }` → the richer `MCPContext`, and unwraps the
 * `ToolExecutionResult` envelope: a non-success result throws so a failed MCP
 * call never silently surfaces as a falsy tool output.
 *
 * @param client  Defaults to `@nebutra/mcp`'s `mcpClient` singleton;
 *                inject a fake for tests.
 */
export function createMcpClientPort(client: McpExecutorLike = mcpClient): McpClientLike {
  return {
    async executeTool(name, args, ctx) {
      const scope = clientCtxSchema.parse(ctx); // fail-closed first

      const mcpCtx: MCPContext = {
        requestId: scope.requestId,
        tenantId: scope.tenantId,
      };

      const result = await client.executeTool(
        name,
        (args ?? {}) as Record<string, unknown>,
        mcpCtx,
      );

      if (!result.success) {
        throw new Error(`MCP tool "${name}" failed: ${result.error ?? "unknown error"}`);
      }
      return result.result;
    },
  };
}
