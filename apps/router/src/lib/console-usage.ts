import "server-only";

import { getSystemDb } from "@nebutra/db";
import {
  monthToDateWindow,
  RequestLogRepository,
  RouterUsageRepository,
  USAGE_EXPORT_LIMIT,
  USAGE_PAGE_LIMIT,
  type UsageGranularity,
} from "@nebutra/repositories";
import { NextResponse } from "next/server";

/**
 * Shared plumbing for the console's usage endpoints.
 *
 * ## The window is UTC, always
 *
 * `from` is inclusive, `to` is exclusive, so consecutive windows tile without
 * counting a request twice. The default is month-to-date in UTC — the same
 * clock the per-key daily cap resets on, because a console that says "$4.10
 * today" while the edge refuses at a cap it computes from a different midnight
 * is a support ticket, not a dashboard.
 *
 * A caller may send ISO strings or epoch milliseconds. Anything unparseable is
 * a 400 with the parameter named: silently falling back to the default would
 * show the customer a number for a period they did not ask about.
 */

const MAX_SPAN_DAYS = 366;

export interface ConsoleWindow {
  from: Date;
  to: Date;
}

function parseInstant(raw: string): Date | null {
  const asNumber = Number(raw);
  const date = Number.isFinite(asNumber) && raw.trim() !== "" ? new Date(asNumber) : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseWindow(
  url: URL,
  now: Date = new Date(),
): { window: ConsoleWindow } | { error: NextResponse } {
  const fallback = monthToDateWindow(now);
  const rawFrom = url.searchParams.get("from");
  const rawTo = url.searchParams.get("to");

  const from = rawFrom ? parseInstant(rawFrom) : fallback.from;
  if (!from) {
    return { error: NextResponse.json({ error: "`from` is not a date." }, { status: 400 }) };
  }
  const to = rawTo ? parseInstant(rawTo) : fallback.to;
  if (!to) {
    return { error: NextResponse.json({ error: "`to` is not a date." }, { status: 400 }) };
  }
  if (to.getTime() <= from.getTime()) {
    return {
      error: NextResponse.json({ error: "`to` must be after `from`." }, { status: 400 }),
    };
  }
  if (to.getTime() - from.getTime() > MAX_SPAN_DAYS * 24 * 60 * 60 * 1000) {
    return {
      error: NextResponse.json(
        { error: `The window may not span more than ${MAX_SPAN_DAYS} days.` },
        { status: 400 },
      ),
    };
  }
  return { window: { from, to } };
}

export function parseGranularity(url: URL): UsageGranularity | { error: NextResponse } {
  const raw = url.searchParams.get("granularity");
  if (!raw || raw === "day") return "day";
  if (raw === "hour") return "hour";
  return {
    error: NextResponse.json({ error: "`granularity` must be `hour` or `day`." }, { status: 400 }),
  };
}

export function parseLimit(url: URL, fallback = 50, ceiling = USAGE_PAGE_LIMIT): number {
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), ceiling);
}

export function usageRepository(): RouterUsageRepository {
  return new RouterUsageRepository(getSystemDb());
}

export function requestLogRepository(): RequestLogRepository {
  return new RequestLogRepository(getSystemDb());
}

/** RFC 4180 enough: quote everything, double the quotes. */
export function toCsv(header: readonly string[], rows: ReadonlyArray<readonly unknown[]>): string {
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    return `"${String(value).replace(/"/g, '""')}"`;
  };
  const lines = [header.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))];
  // A leading BOM so Excel opens UTF-8 model ids without mangling them.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, body: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

export { USAGE_EXPORT_LIMIT, USAGE_PAGE_LIMIT };
