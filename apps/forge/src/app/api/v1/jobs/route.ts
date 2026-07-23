import { getDefaultJobStore, invokeTool } from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";

/**
 * POST /api/v1/jobs
 * Body: { toolId: string, input: unknown }
 * Creates a job, runs tool async in-process (demo). Production: queue worker.
 */
export async function POST(request: Request) {
  let body: { toolId?: string; input?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.toolId) {
    return NextResponse.json({ error: "toolId required" }, { status: 400 });
  }

  const store = getDefaultJobStore();
  const job = store.create(body.toolId);
  store.markRunning(job.id);

  // Fire-and-forget in-process (demo). Errors captured on job.
  void (async () => {
    try {
      const result = await invokeTool(getForgeRegistry(), {
        toolId: body.toolId as string,
        input: body.input ?? {},
        requestId: job.id,
      });
      if (result.ok) store.complete(job.id, result.output);
      else store.fail(job.id, `${result.code}: ${result.message}`);
    } catch (err) {
      store.fail(job.id, err instanceof Error ? err.message : String(err));
    }
  })();

  return NextResponse.json(job, { status: 202 });
}
