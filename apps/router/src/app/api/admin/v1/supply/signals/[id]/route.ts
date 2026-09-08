import { err, gateStaff, json } from "@/lib/admin/service-token";
import { SupplyConfigError } from "@/lib/supply/clients";
import { readSignal } from "@/lib/supply/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  const { id } = await context.params;
  try {
    const reading = await readSignal(id);
    if (!reading) return json(err("not_found", `Unknown signal ${id}.`), 404);
    return json(reading);
  } catch (error) {
    if (error instanceof SupplyConfigError)
      return json(err("upstream_unavailable", error.message), 503);
    return json(
      err("upstream_unavailable", error instanceof Error ? error.message : "probe failed"),
      502,
    );
  }
}
