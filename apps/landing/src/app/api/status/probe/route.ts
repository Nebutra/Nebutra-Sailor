import { getStatusSnapshot } from "@/lib/status-checks";

/**
 * Scheduled probe target. The gateway Worker's cron calls this every five
 * minutes so history accrues whether or not anyone opens the page. No auth:
 * it only checks public URLs, and the per-window sample lock means calling it
 * more often cannot add samples.
 */
export async function GET() {
  const snapshot = await getStatusSnapshot();
  return Response.json(
    {
      checkedAt: snapshot.checkedAt,
      overall: snapshot.overall,
      services: snapshot.services.map((s) => ({ id: s.id, state: s.state })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
