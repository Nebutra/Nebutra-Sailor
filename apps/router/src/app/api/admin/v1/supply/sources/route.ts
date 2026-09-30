import { err, gateStaff, json } from "@/lib/admin/service-token";
import { listSourcesForAdmin } from "@/lib/supply/capability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  try {
    const items = await listSourcesForAdmin();
    return json({ items, total: items.length, probedAt: new Date().toISOString() });
  } catch (error) {
    return json(
      err("internal", error instanceof Error ? error.message : "sources unavailable"),
      500,
    );
  }
}
