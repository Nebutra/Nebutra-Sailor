import { requireConsoleTenant } from "@/lib/console-tenant";
import {
  csvResponse,
  parseWindow,
  toCsv,
  USAGE_EXPORT_LIMIT,
  usageRepository,
} from "@/lib/console-usage";

export const dynamic = "force-dynamic";

const HEADER = [
  "occurred_at",
  "request_id",
  "model",
  "key_id",
  "prompt_tokens",
  "completion_tokens",
  "cache_read_tokens",
  "cache_write_tokens",
  "latency_ms",
  "status",
  "quantity",
  "unit",
  "unit_cost",
  "total_cost",
  "currency",
] as const;

/**
 * The same rows as `usage/records`, as CSV.
 *
 * Capped at {@link USAGE_EXPORT_LIMIT} rows in one response — an export is a
 * download, not a pagination API, and a request that would silently truncate
 * says so in `x-nebutra-truncated` rather than handing over a short file that
 * looks complete.
 */
export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const parsed = parseWindow(url);
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const result = await usageRepository().records({
    tenantId: ctx.tenantId,
    from,
    to,
    ...(url.searchParams.get("model") ? { model: url.searchParams.get("model") as string } : {}),
    ...(url.searchParams.get("keyId") ? { keyId: url.searchParams.get("keyId") as string } : {}),
    limit: USAGE_EXPORT_LIMIT,
  });

  const body = toCsv(
    HEADER,
    result.rows.map((row) => [
      row.occurredAt.toISOString(),
      row.requestId,
      row.model,
      row.keyId,
      row.promptTokens,
      row.completionTokens,
      row.cachedPromptTokens,
      row.cacheWriteTokens,
      row.latencyMs,
      row.status,
      row.quantity,
      row.unit,
      row.unitCost,
      row.totalCost.toFixed(6),
      row.currency,
    ]),
  );

  const name = `nebutra-usage-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;
  const response = csvResponse(name, body);
  if (result.nextCursor) response.headers.set("x-nebutra-truncated", "1");
  return response;
}
