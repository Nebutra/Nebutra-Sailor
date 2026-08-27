import {
  buildBatchAggregate,
  getDefaultBatchStore,
  getDefaultJobStore,
} from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";

/** GET /api/v1/batches/:batchId — aggregate status (no per-item result payloads). */
export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const manifest = await getDefaultBatchStore().get(batchId);
  if (!manifest) {
    return NextResponse.json({ error: "batch_not_found" }, { status: 404 });
  }

  const jobStore = getDefaultJobStore();
  const jobs = await Promise.all(manifest.itemIds.map((id) => jobStore.get(id)));
  const aggregate = buildBatchAggregate(manifest, jobs);
  return NextResponse.json(aggregate);
}
