import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseWindow, usageRepository } from "@/lib/console-usage";

export const dynamic = "force-dynamic";

/**
 * Window totals for the signed-in tenant.
 *
 * Read from `usage_ledger_entries` — the rows the customer is actually billed
 * from. The Router console never reads the gateway's rollups (PRD D1): two
 * aggregates over two stores would disagree eventually, and both would look
 * right.
 *
 * → `{window{from,to}, totalCost, totalTokens, promptTokens, completionTokens,
 *    requestCount, currency}`
 */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = parseWindow(new URL(request.url));
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const summary = await usageRepository().summary({ tenantId: ctx.tenantId, from, to });
  return NextResponse.json({
    window: { from: from.toISOString(), to: to.toISOString() },
    ...summary,
  });
}
