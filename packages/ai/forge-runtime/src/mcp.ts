import { invokeTool } from "./invoke";
import type { ForgeRegistry } from "./registry";

/** MCP-shaped tool descriptor (JSON-RPC friendly, no MCP SDK hard dep). */
export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly additionalProperties: boolean;
  };
}

export function listMcpTools(registry: ForgeRegistry): McpToolDescriptor[] {
  return registry.list().map((t) => {
    const def = registry.get(t.id);
    return {
      name: t.id.replace(/\//g, "__"),
      description: `${t.title.en} / ${t.title.zh} — ${t.description.en}`,
      inputSchema: {
        type: "object",
        properties: zodToLooseJsonSchema(def.inputSchema),
        additionalProperties: true,
      },
    };
  });
}

export async function callMcpTool(
  registry: ForgeRegistry,
  name: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const toolId = name.includes("__") ? name.replace(/__/g, "/") : name;
  const result = await invokeTool(registry, {
    toolId,
    input: args ?? {},
  });
  if (!result.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: `${result.code}: ${result.message}` }],
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(result.output, null, 2) }],
  };
}

/** Best-effort Zod → JSON Schema fragment (not full OpenAPI). */
function zodToLooseJsonSchema(_schema: unknown): Record<string, unknown> {
  void _schema;
  return {
    type: "object",
    description: "See tool OpenAPI / human page for field details",
  };
}

export function createForgeMcpHandlers(registry: ForgeRegistry) {
  return {
    listTools: () => listMcpTools(registry),
    callTool: (name: string, args: unknown) => callMcpTool(registry, name, args),
  };
}
