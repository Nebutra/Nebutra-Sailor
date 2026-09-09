import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { getBalanceForDisplay } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/** Balance for the signed-in tenant. Display read — see `lib/wallet.ts`. */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;
  const balance = await getBalanceForDisplay(ctx.tenantId);
  return NextResponse.json(balance);
}
