import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseGranularity, parseWindow, usageRepository } from "@/lib/console-usage";

export const dynamic = "force-dynamic";

/**
 * Cost over time, bucketed in UTC.
 *
 * → `{window, granularity, buckets:[{bucket,cost,requests,tokens}]}`
 *
 * Buckets with no spend are returned as zeros rather than omitted, so a chart
 * does not have to guess whether a gap is "no data" or "nothing spent" — the
 * window says which buckets exist, and every one of them is present.
 */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const parsed = parseWindow(url);
  if ("error" in parsed) return parsed.error;
  const granularity = parseGranularity(url);
  if (typeof granularity !== "string") return granularity.error;
  const { from, to } = parsed.window;

  const rows = await usageRepository().history({ tenantId: ctx.tenantId, from, to }, granularity);
  const found = new Map(rows.map((row) => [row.bucket.getTime(), row]));

  const step = granularity === "hour" ? 3_600_000 : 86_400_000;
  const start =
    granularity === "hour"
      ? Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours())
      : Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());

  const buckets: Array<{ bucket: string; cost: number; requests: number; tokens: number }> = [];
  for (let at = start; at < to.getTime(); at += step) {
    const hit = found.get(at);
    buckets.push({
      bucket: new Date(at).toISOString(),
      cost: hit?.cost ?? 0,
      requests: hit?.requests ?? 0,
      tokens: hit?.tokens ?? 0,
    });
  }

  return NextResponse.json({
    window: { from: from.toISOString(), to: to.toISOString() },
    granularity,
    buckets,
  });
}
