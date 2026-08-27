import { getDefaultJobStore, invokeTool } from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";

/**
 * POST /api/v1/jobs/worker
 * Body: { jobId, toolId, input }
 *
 * Shared worker entry for http / QStash dispatch. Optional shared secret:
 * FORGE_JOB_WORKER_SECRET → header x-forge-job-secret
 */
export async function POST(request: Request) {
  const secret = process.env.FORGE_JOB_WORKER_SECRET;
  if (secret) {
    const got = request.headers.get("x-forge-job-secret");
    if (got !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: { jobId?: string; toolId?: string; input?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.jobId || !body.toolId) {
    return NextResponse.json({ error: "jobId and toolId required" }, { status: 400 });
  }

  const store = getDefaultJobStore();
  const existing = await store.get(body.jobId);
  if (!existing) {
    // Job may live only in this worker's memory if store is process-local —
    // still execute and best-effort complete.
  } else if (existing.status === "succeeded" || existing.status === "failed") {
    return NextResponse.json(existing);
  } else {
    await store.markRunning(body.jobId);
  }

  try {
    const result = await invokeTool(getForgeRegistry(), {
      toolId: body.toolId,
      input: body.input ?? {},
      requestId: body.jobId,
    });
    if (result.ok) {
      await store.complete(body.jobId, result.output);
      return NextResponse.json({
        id: body.jobId,
        status: "succeeded",
        result: result.output,
      });
    }
    await store.fail(body.jobId, `${result.code}: ${result.message}`);
    return NextResponse.json(
      { id: body.jobId, status: "failed", error: result.message },
      { status: 422 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.fail(body.jobId, message);
    return NextResponse.json({ id: body.jobId, status: "failed", error: message }, { status: 500 });
  }
}
