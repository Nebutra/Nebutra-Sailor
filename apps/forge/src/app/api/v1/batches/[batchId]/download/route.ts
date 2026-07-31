import {
  buildStoreZip,
  extractFileFromJobResult,
  getDefaultBatchStore,
  getDefaultJobStore,
} from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/batches/:batchId/download
 * Only for resultKind === "file". Bundles succeeded item outputs into a ZIP.
 */
export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const manifest = await getDefaultBatchStore().get(batchId);
  if (!manifest) {
    return NextResponse.json({ error: "batch_not_found" }, { status: 404 });
  }
  if (manifest.resultKind !== "file") {
    return NextResponse.json(
      {
        error: "not_applicable",
        message:
          "Zip download is only for resultKind=file batches; use GET aggregate + job results for json",
      },
      { status: 409 },
    );
  }

  const jobStore = getDefaultJobStore();
  const entries = [];
  for (let i = 0; i < manifest.itemIds.length; i++) {
    const id = manifest.itemIds[i]!;
    const job = await jobStore.get(id);
    if (!job || job.status !== "succeeded" || job.result === undefined) continue;
    const label = job.label ?? `item-${i + 1}`;
    const entry = extractFileFromJobResult(job.result, label);
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "no_files", message: "No succeeded file results to download yet" },
      { status: 409 },
    );
  }

  const zip = buildStoreZip(entries);
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="forge-batch-${batchId.slice(0, 8)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
