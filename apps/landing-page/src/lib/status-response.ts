import { getStatusSnapshot } from "@/lib/status-checks";

export async function statusSnapshotResponse() {
  const snapshot = await getStatusSnapshot();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
    status: snapshot.overall === "outage" ? 503 : 200,
  });
}
