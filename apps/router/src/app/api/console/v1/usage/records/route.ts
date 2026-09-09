import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseLimit, parseWindow, usageRepository } from "@/lib/console-usage";

export const dynamic = "force-dynamic";

/**
 * Per-request detail rows, newest first.
 *
 * → `{window, rows:[{id,occurredAt,type,model,keyId,requestId,promptTokens,
 *    completionTokens,cachedPromptTokens,cacheWriteTokens,latencyMs,status,
 *    quantity,unit,unitCost,totalCost,currency}], nextCursor}`
 *
 * Keyset pagination on `(occurredAt, id)`: an offset would shift under a live
 * relay and show the same row on two pages. `nextCursor` is opaque — hand it
 * back untouched.
 *
 * Reads the ledger only (D1), so every row here corresponds to a charge.
 */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const parsed = parseWindow(url);
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const rawStatus = url.searchParams.get("status");
  const status = rawStatus === null ? undefined : Number(rawStatus);
  if (status !== undefined && !Number.isFinite(status)) {
    return NextResponse.json({ error: "`status` must be an HTTP status." }, { status: 400 });
  }

  const result = await usageRepository().records({
    tenantId: ctx.tenantId,
    from,
    to,
    ...(url.searchParams.get("model") ? { model: url.searchParams.get("model") as string } : {}),
    ...(url.searchParams.get("keyId") ? { keyId: url.searchParams.get("keyId") as string } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(url.searchParams.get("cursor") ? { cursor: url.searchParams.get("cursor") as string } : {}),
    limit: parseLimit(url),
  });

  return NextResponse.json({
    window: { from: from.toISOString(), to: to.toISOString() },
    rows: result.rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
    nextCursor: result.nextCursor,
  });
}
