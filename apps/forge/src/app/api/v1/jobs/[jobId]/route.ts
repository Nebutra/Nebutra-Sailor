import { getDefaultJobStore } from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";

/** GET /api/v1/jobs/:jobId */
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const job = await getDefaultJobStore().get(jobId);
  if (!job) {
    return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  }
  return NextResponse.json(job);
}
