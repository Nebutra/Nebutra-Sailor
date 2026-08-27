import { getDefaultBatchStore, getDefaultJobStore, retryBatchItem } from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { dispatchBatchItem } from "@/lib/batch-dispatch";

/**
 * POST /api/v1/batches/:batchId/items/:itemId/retry
 * Body: { input: unknown } — required so we re-run with known input
 * (jobs do not store original input).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string; itemId: string }> },
) {
  const { batchId, itemId } = await context.params;
  let body: { input?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  if (body.input === undefined) {
    return NextResponse.json(
      { error: "input_required", message: "Retry requires the item input body" },
      { status: 400 },
    );
  }

  const result = await retryBatchItem(
    getDefaultJobStore(),
    getDefaultBatchStore(),
    batchId,
    itemId,
  );
  if (!result.ok) {
    const status =
      result.code === "batch_not_found" || result.code === "item_not_found" ? 404 : 409;
    return NextResponse.json({ error: result.code, message: result.message }, { status });
  }

  dispatchBatchItem(result.job, body.input);
  return NextResponse.json(
    {
      batchId,
      itemId: result.job.id,
      previousItemId: itemId,
      index: result.index,
      status: "running",
    },
    { status: 202 },
  );
}
