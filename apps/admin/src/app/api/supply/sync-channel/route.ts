import { NextResponse } from "next/server";
import { requireStaff, StaffAccessError } from "@/lib/staff";
import { SupplyConfigError, syncCliProxyChannel } from "@/lib/supply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Push CLIProxyAPI's current model list into its New-API channel.
 * A write on RouterSupply: the read-only tier may look, not sync.
 */
export async function POST() {
  try {
    const staff = await requireStaff();
    if (staff.role === "platform_readonly") {
      throw new StaffAccessError("Role platform_readonly may not sync RouterSupply.");
    }
    const result = await syncCliProxyChannel();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SupplyConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync_failed" },
      { status: 502 },
    );
  }
}
