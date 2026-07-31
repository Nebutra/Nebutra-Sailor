import {
  buildBatchAggregate,
  createBatchJobs,
  createForgeMcpHandlers,
  type ForgeMcpBatchHooks,
  getDefaultBatchStore,
  getDefaultJobStore,
  resolveBatchMaxItems,
} from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { dispatchBatchItem } from "@/lib/batch-dispatch";
import { getForgeRegistry } from "@/lib/registry";

function batchHooks(): ForgeMcpBatchHooks {
  return {
    async create({ toolId, items }) {
      const registry = getForgeRegistry();
      if (!registry.has(toolId)) {
        throw new Error(`tool_not_found: ${toolId}`);
      }
      const tool = registry.get(toolId);
      if (!tool.batch) {
        throw new Error(`batch_not_supported: ${toolId}`);
      }
      const maxItems = resolveBatchMaxItems(tool.batch.maxItems);
      const created = await createBatchJobs(getDefaultJobStore(), getDefaultBatchStore(), {
        toolId: tool.id,
        resultKind: tool.batch.resultKind,
        maxItems,
        items,
      });
      if (!created.ok) {
        throw new Error(`${created.code}: ${created.message}`);
      }
      for (let i = 0; i < created.jobs.length; i++) {
        dispatchBatchItem(created.jobs[i]!, items[i]?.input ?? {});
      }
      return {
        batchId: created.manifest.id,
        toolId: created.manifest.toolId,
        itemIds: created.manifest.itemIds,
        resultKind: created.manifest.resultKind,
        status: "running",
        maxItems,
        createdAt: created.manifest.createdAt,
      };
    },
    async get(batchId) {
      const manifest = await getDefaultBatchStore().get(batchId);
      if (!manifest) return null;
      const jobs = await Promise.all(manifest.itemIds.map((id) => getDefaultJobStore().get(id)));
      return buildBatchAggregate(manifest, jobs);
    },
  };
}

/**
 * Minimal MCP-over-HTTP JSON surface for Agents.
 *
 * POST body:
 *   { "method": "tools/list" }
 *   { "method": "tools/call", "params": { "name": "text__word-count", "arguments": { "text": "hi" } } }
 *   { "method": "tools/call", "params": { "name": "forge.batch.create", "arguments": { ... } } }
 */
export async function POST(request: Request) {
  let body: {
    method?: string;
    params?: { name?: string; arguments?: unknown };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const mcp = createForgeMcpHandlers(getForgeRegistry(), { batch: batchHooks() });

  if (body.method === "tools/list") {
    return NextResponse.json({ tools: mcp.listTools() });
  }

  if (body.method === "tools/call") {
    const name = body.params?.name;
    if (!name) {
      return NextResponse.json({ error: "params.name required" }, { status: 400 });
    }
    const result = await mcp.callTool(name, body.params?.arguments ?? {});
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "unsupported_method", supported: ["tools/list", "tools/call"] },
    { status: 400 },
  );
}

export async function GET() {
  return NextResponse.json({
    protocol: "nebutra-forge-mcp-http",
    methods: ["tools/list", "tools/call"],
    batch: ["forge.batch.create", "forge.batch.get"],
    note: "JSON HTTP bridge; full MCP stdio can wrap createForgeMcpHandlers({ batch })",
  });
}
