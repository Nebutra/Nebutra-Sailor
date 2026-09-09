import { REQUEST_LOG_RETENTION_DAYS } from "@nebutra/repositories";
import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { parseLimit, parseWindow, requestLogRepository } from "@/lib/console-usage";
import { getApiKeyRepository } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * The per-key request log.
 *
 * `ai_request_logs` is the request record, not the money record — that is the
 * ledger, and `/usage/records` serves it. This one answers "what happened to
 * request `req_…`": path, model, first-byte time, upstream channel, status.
 *
 * A key with `saveLogs` off gets `403 logging_disabled`. Rows are still
 * written for it, but without any prompt-derived field, so serving them here
 * would be serving a table of blanks and calling it a log.
 *
 * → `{rows:[{requestId,createdAt,path,model,status,httpStatus,ttfbMs,latencyMs,
 *    promptTokens,completionTokens,cachedPromptTokens,cacheWriteTokens,cost,
 *    supplyPath,errorMessage}], nextCursor, retentionDays}`
 */
export async function GET(request: Request, context: RouteContext) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await context.params;
  const key = await getApiKeyRepository().findDetail(ctx.tenantId, id);
  if (!key) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!key.saveLogs) {
    return NextResponse.json(
      {
        error: "This key does not keep request logs. Turn on 保存日志 to start recording them.",
        code: "logging_disabled",
      },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const parsed = parseWindow(url);
  if ("error" in parsed) return parsed.error;
  const { from, to } = parsed.window;

  const result = await requestLogRepository().list({
    tenantId: ctx.tenantId,
    apiKeyId: id,
    from,
    to,
    ...(url.searchParams.get("requestId")
      ? { requestId: url.searchParams.get("requestId") as string }
      : {}),
    ...(url.searchParams.get("path") ? { path: url.searchParams.get("path") as string } : {}),
    ...(url.searchParams.get("cursor") ? { cursor: url.searchParams.get("cursor") as string } : {}),
    limit: parseLimit(url),
  });

  return NextResponse.json({
    rows: result.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    nextCursor: result.nextCursor,
    retentionDays: REQUEST_LOG_RETENTION_DAYS,
  });
}
