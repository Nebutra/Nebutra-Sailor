import { ADMIN_ERROR_STATUS } from "@nebutra/contracts/admin";
import { err, gateStaff, json } from "@/lib/admin/service-token";
import { listLogins } from "@/lib/supply/login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  try {
    return json(await listLogins());
  } catch (error) {
    return json(
      err("upstream_unavailable", error instanceof Error ? error.message : "probe failed"),
      ADMIN_ERROR_STATUS.upstream_unavailable,
    );
  }
}
