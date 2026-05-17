/**
 * MCP activation bridge (WRAP — capability #9, activation seam).
 *
 * Concrete bridge that registers external MCP-server tools into the runtime's
 * uniform tool model. It does NOT import `@nebutra/mcp` (WIP / do-not-import):
 * instead it defines minimal injectable ports so callers wire `@nebutra/mcp`
 * (`serverRegistry` + `mcpClient`) without this package taking a hard dep.
 *
 * Tenant-scoped by construction: the catalog port is always queried with the
 * caller's `{ tenantId, plan }`, so a tenant only ever sees its own MCP
 * servers/tools. Fail-closed on missing tenant.
 */

import { z } from "zod";

import {
  adaptMcpTool,
  type McpClientLike,
  type ToolDefinition,
  type ToolRegistry,
} from "./tools.js";

/**
 * Port over an MCP server catalog (satisfied by `@nebutra/mcp`'s
 * `serverRegistry` + plan middleware). Returns only the tools visible to the
 * given tenant/plan — visibility/plan-gating is the port's responsibility.
 */
export interface McpServerCatalogPort {
  listTools(ctx: {
    tenantId: string;
    plan?: string;
  }): Promise<{ server: string; definition: ToolDefinition }[]>;
}

const ctxSchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required (fail-closed)"),
  plan: z.string().min(1).optional(),
});

export interface ActivateMcpToolsResult {
  /** Tool names newly registered into the registry, in catalog order. */
  readonly registered: readonly string[];
  /** Tool names skipped because the name was already registered. */
  readonly skipped: readonly string[];
}

/**
 * List the tenant/plan-visible MCP tools, adapt each via {@link adaptMcpTool},
 * and register them into the {@link ToolRegistry}. A tool whose name is already
 * registered is skipped (reported, never thrown). Empty/blank tenantId fails
 * closed before any catalog call.
 */
export async function activateMcpTools(
  registry: ToolRegistry,
  catalog: McpServerCatalogPort,
  client: McpClientLike,
  ctx: { tenantId: string; plan?: string },
): Promise<ActivateMcpToolsResult> {
  const scope = ctxSchema.parse(ctx);

  const entries = await catalog.listTools(
    scope.plan === undefined
      ? { tenantId: scope.tenantId }
      : { tenantId: scope.tenantId, plan: scope.plan },
  );

  const registered: string[] = [];
  const skipped: string[] = [];

  for (const { server, definition } of entries) {
    if (registry.list().some((r) => r.definition.name === definition.name)) {
      skipped.push(definition.name);
      continue;
    }
    const adapted = adaptMcpTool(server, definition, client);
    registry.register(adapted.definition, adapted.handler, adapted.origin);
    registered.push(definition.name);
  }

  return { registered, skipped };
}
