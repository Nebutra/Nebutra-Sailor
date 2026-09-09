import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseWindow, usageRepository } from "@/lib/console-usage";

export const dynamic = "force-dynamic";

/**
 * → `{window, rows:[{keyId,name,keyPrefix,cost,requests}]}`
 *
 * A key that was deleted after it spent still appears, with a null name: the
 * money it spent was real and has to add up to the window total.
 */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = parseWindow(new URL(request.url));
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const rows = await usageRepository().byKey({ tenantId: ctx.tenantId, from, to });
  return NextResponse.json({ window: { from: from.toISOString(), to: to.toISOString() }, rows });
}
