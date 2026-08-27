import {
  createBatchJobs,
  getDefaultBatchStore,
  getDefaultJobStore,
  resolveBatchMaxItems,
} from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { dispatchBatchItem } from "@/lib/batch-dispatch";
import { getForgeRegistry } from "@/lib/registry";

/**
 * POST /api/v1/batches
 * Body: { toolId: string, items: Array<{ label?: string, input: unknown }> }
 *
 * Creates a batch manifest + N jobs and dispatches each item independently.
 * Returns 202 { batchId, itemIds, resultKind, status: "running" }.
 */
export async function POST(request: Request) {
  let body: {
    toolId?: string;
    items?: Array<{ label?: string; input?: unknown }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.toolId) {
    return NextResponse.json({ error: "toolId required" }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const registry = getForgeRegistry();
  if (!registry.has(body.toolId)) {
    return NextResponse.json({ error: "tool_not_found", toolId: body.toolId }, { status: 404 });
  }

  const tool = registry.get(body.toolId);
  if (!tool.batch) {
    return NextResponse.json(
      {
        error: "batch_not_supported",
        message: `Tool ${body.toolId} does not declare batch metadata`,
      },
      { status: 400 },
    );
  }

  const maxItems = resolveBatchMaxItems(tool.batch.maxItems);
  const jobStore = getDefaultJobStore();
  const batchStore = getDefaultBatchStore();

  const created = await createBatchJobs(jobStore, batchStore, {
    toolId: tool.id,
    resultKind: tool.batch.resultKind,
    maxItems,
    items: body.items.map((it) => {
      const item: { label?: string; input: unknown } = {
        input: it.input ?? {},
      };
      if (it.label !== undefined) item.label = it.label;
      return item;
    }),
  });

  if (!created.ok) {
    const status = created.code === "batch_too_large" ? 413 : 400;
    return NextResponse.json(
      { error: created.code, message: created.message, maxItems },
      { status },
    );
  }

  // Dispatch each runnable item independently (no shared Promise.all chain).
  for (let i = 0; i < created.jobs.length; i++) {
    const job = created.jobs[i]!;
    const input = body.items[i]?.input ?? {};
    dispatchBatchItem(job, input);
  }

  return NextResponse.json(
    {
      batchId: created.manifest.id,
      toolId: created.manifest.toolId,
      itemIds: created.manifest.itemIds,
      resultKind: created.manifest.resultKind,
      status: "running",
      maxItems,
      createdAt: created.manifest.createdAt,
    },
    { status: 202 },
  );
}
