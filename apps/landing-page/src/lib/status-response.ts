import { getStatusSnapshot } from "@/lib/status-checks";

/**
 * Always return HTTP 200 with the status snapshot JSON.
 *
 * `/status.json` is a status report intended for humans (download link on the
 * status page) and dashboards — not a load-balancer health probe. Aggregate
 * degradation is conveyed via the `overall` field in the JSON body, not via
 * an HTTP error code. Returning 503 here would break downloadability and
 * trick consumers into treating the report itself as unavailable.
 */
export async function statusSnapshotResponse() {
  const snapshot = await getStatusSnapshot();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
    status: 200,
  });
}
