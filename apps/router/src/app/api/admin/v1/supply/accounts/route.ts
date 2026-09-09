import { ADMIN_ERROR_STATUS } from "@nebutra/contracts/admin";
import { err, gateStaff, json } from "@/lib/admin/service-token";
import { SupplyConfigError } from "@/lib/supply/clients";
import { listAccounts } from "@/lib/supply/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await gateStaff(request);
  if (!gate.ok) return json(gate.body, gate.status);
  try {
    return json(await listAccounts());
  } catch (error) {
    if (error instanceof SupplyConfigError)
      return json(
        err("upstream_unavailable", error.message),
        ADMIN_ERROR_STATUS.upstream_unavailable,
      );
    return json(
      err("upstream_unavailable", error instanceof Error ? error.message : "probe failed"),
      ADMIN_ERROR_STATUS.upstream_unavailable,
    );
  }
}
