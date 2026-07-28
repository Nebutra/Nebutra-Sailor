import { invokeTool } from "./invoke";
import { toolInputJsonSchema } from "./json-schema";
import type { ForgeRegistry } from "./registry";

/** MCP-shaped tool descriptor (JSON-RPC friendly, no MCP SDK hard dep). */
export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  /** JSON Schema derived from the tool's Zod input schema. */
  readonly inputSchema: Record<string, unknown>;
  /** Demand roots (§6.7) so planners can group tools by verb. */
  readonly roots: readonly string[];
}

export function listMcpTools(registry: ForgeRegistry): McpToolDescriptor[] {
  return registry.list().map((t) => {
    const def = registry.get(t.id);
    return {
      name: t.id.replace(/\//g, "__"),
      description: `${t.title.en} / ${t.title.zh} — ${t.description.en}`,
      inputSchema: toolInputJsonSchema(def.inputSchema),
      roots: t.roots ?? [],
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

export function createForgeMcpHandlers(registry: ForgeRegistry) {
  return {
    listTools: () => listMcpTools(registry),
    callTool: (name: string, args: unknown) => callMcpTool(registry, name, args),
  };
}
