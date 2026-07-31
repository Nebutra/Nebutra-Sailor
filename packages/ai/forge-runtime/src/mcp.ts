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

export type McpCallResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/**
 * Host-injected Processor batch surface (F2 Track A6).
 * Runtime stays free of HTTP/dispatch; the product host wires stores + workers.
 */
export interface ForgeMcpBatchHooks {
  create(input: {
    toolId: string;
    items: Array<{ label?: string; input: unknown }>;
  }): Promise<unknown>;
  get(batchId: string): Promise<unknown | null>;
}

const BATCH_CREATE_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["toolId", "items"],
  additionalProperties: false,
  properties: {
    toolId: {
      type: "string",
      description: "Forge tool id that declares batch metadata (e.g. image/compress)",
    },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["input"],
        properties: {
          label: { type: "string" },
          input: { description: "Same shape as the tool's own input schema" },
        },
      },
    },
  },
};

const BATCH_GET_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["batchId"],
  additionalProperties: false,
  properties: {
    batchId: { type: "string", description: "Id returned by forge.batch.create" },
  },
};

function batchToolDescriptors(): McpToolDescriptor[] {
  return [
    {
      name: "forge.batch.create",
      description:
        "Create a Processor batch: N independent invokes of one batch-capable tool. Returns batchId; poll forge.batch.get. Partial failures do not cancel siblings.",
      inputSchema: BATCH_CREATE_SCHEMA,
      roots: ["processor"],
    },
    {
      name: "forge.batch.get",
      description:
        "Poll a batch aggregate (status, counts, per-item status). Does not inline item result payloads — fetch GET /api/v1/jobs/{id} for succeeded items.",
      inputSchema: BATCH_GET_SCHEMA,
      roots: ["processor"],
    },
  ];
}

export function listMcpTools(
  registry: ForgeRegistry,
  options?: { includeBatch?: boolean },
): McpToolDescriptor[] {
  const tools = registry.list().map((t) => {
    const def = registry.get(t.id);
    return {
      name: t.id.replace(/\//g, "__"),
      description: `${t.title.en} / ${t.title.zh} — ${t.description.en}`,
      inputSchema: toolInputJsonSchema(def.inputSchema),
      roots: t.roots ?? [],
    };
  });
  // Only advertise batch tools when the host wired hooks (includeBatch: true).
  if (options?.includeBatch) {
    return [...batchToolDescriptors(), ...tools];
  }
  return tools;
}

export async function callMcpTool(
  registry: ForgeRegistry,
  name: string,
  args: unknown,
): Promise<McpCallResult> {
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

async function callBatchMcp(
  hooks: ForgeMcpBatchHooks,
  name: string,
  args: unknown,
): Promise<McpCallResult> {
  try {
    if (name === "forge.batch.create") {
      const body = (args ?? {}) as {
        toolId?: string;
        items?: Array<{ label?: string; input?: unknown }>;
      };
      if (!body.toolId || !Array.isArray(body.items)) {
        return {
          isError: true,
          content: [{ type: "text", text: "toolId and items[] required" }],
        };
      }
      const out = await hooks.create({
        toolId: body.toolId,
        items: body.items.map((it) => {
          const item: { label?: string; input: unknown } = { input: it.input ?? {} };
          if (it.label !== undefined) item.label = it.label;
          return item;
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    }
    if (name === "forge.batch.get") {
      const body = (args ?? {}) as { batchId?: string };
      if (!body.batchId) {
        return {
          isError: true,
          content: [{ type: "text", text: "batchId required" }],
        };
      }
      const out = await hooks.get(body.batchId);
      if (out == null) {
        return {
          isError: true,
          content: [{ type: "text", text: "batch_not_found" }],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
    };
  }
  return {
    isError: true,
    content: [{ type: "text", text: `unknown_batch_tool: ${name}` }],
  };
}

export function createForgeMcpHandlers(
  registry: ForgeRegistry,
  options?: { batch?: ForgeMcpBatchHooks; includeBatch?: boolean },
) {
  const includeBatch = options?.includeBatch !== false && Boolean(options?.batch);
  return {
    listTools: () => listMcpTools(registry, { includeBatch }),
    callTool: async (name: string, args: unknown): Promise<McpCallResult> => {
      if (options?.batch && (name === "forge.batch.create" || name === "forge.batch.get")) {
        return callBatchMcp(options.batch, name, args);
      }
      return callMcpTool(registry, name, args);
    },
  };
}
