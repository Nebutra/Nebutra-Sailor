import {
  dispatchJob,
  getDefaultJobStore,
  invokeTool,
  resolveJobDispatchMode,
} from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";

/**
 * POST /api/v1/jobs
 * Body: { toolId: string, input: unknown }
 *
 * Dispatch modes (FORGE_JOB_MODE or auto):
 * - inline  — fire-and-forget in this process (default)
 * - http    — POST to FORGE_JOB_WORKER_URL
 * - qstash  — Upstash QStash → worker URL (needs QSTASH_TOKEN)
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
  const job = await store.create(body.toolId);
  await store.markRunning(job.id);

  const mode = resolveJobDispatchMode();
  const payload = {
    jobId: job.id,
    toolId: body.toolId,
    input: body.input ?? {},
  };

  if (mode === "inline") {
    void (async () => {
      try {
        const result = await invokeTool(getForgeRegistry(), {
          toolId: body.toolId as string,
          input: body.input ?? {},
          requestId: job.id,
        });
        if (result.ok) await store.complete(job.id, result.output);
        else await store.fail(job.id, `${result.code}: ${result.message}`);
      } catch (err) {
        await store.fail(job.id, err instanceof Error ? err.message : String(err));
      }
    })();
    return NextResponse.json({ ...job, dispatch: "inline" }, { status: 202 });
  }

  try {
    const dispatched = await dispatchJob(payload);
    return NextResponse.json(
      { ...job, dispatch: dispatched.mode, accepted: dispatched.accepted },
      { status: 202 },
    );
  } catch (err) {
    await store.fail(job.id, err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        error: "dispatch_failed",
        message: err instanceof Error ? err.message : String(err),
        jobId: job.id,
      },
      { status: 502 },
    );
  }
}
