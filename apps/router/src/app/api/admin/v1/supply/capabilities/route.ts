import { err, gateStaff, json } from "@/lib/admin/service-token";
import { listCapabilitiesForAdmin } from "@/lib/supply/capability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  const url = new URL(request.url);
  const sourceKey = url.searchParams.get("source");
  const state = url.searchParams.get("state");
  try {
    const items = await listCapabilitiesForAdmin({
      ...(sourceKey ? { sourceKey } : {}),
      ...(state ? { state } : {}),
    });
    return json({ items, total: items.length, probedAt: new Date().toISOString() });
  } catch (error) {
    return json(
      err("internal", error instanceof Error ? error.message : "capabilities unavailable"),
      500,
    );
  }
}
