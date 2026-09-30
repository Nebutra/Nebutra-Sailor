import { err, gateStaff, json } from "@/lib/admin/service-token";
import { listQuotaWindowsForAdmin } from "@/lib/supply/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  const url = new URL(request.url);
  const sourceKey = url.searchParams.get("source");
  try {
    const items = await listQuotaWindowsForAdmin({ ...(sourceKey ? { sourceKey } : {}) });
    return json({ items, total: items.length, probedAt: new Date().toISOString() });
  } catch (error) {
    return json(
      err("internal", error instanceof Error ? error.message : "quota windows unavailable"),
      500,
    );
  }
}
