import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseWindow, usageRepository } from "@/lib/console-usage";

export const dynamic = "force-dynamic";

/** → `{window, rows:[{model,cost,requests,promptTokens,completionTokens}]}` */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = parseWindow(new URL(request.url));
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const rows = await usageRepository().byModel({ tenantId: ctx.tenantId, from, to });
  return NextResponse.json({ window: { from: from.toISOString(), to: to.toISOString() }, rows });
}
