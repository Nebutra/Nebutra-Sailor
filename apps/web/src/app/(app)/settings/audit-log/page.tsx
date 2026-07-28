"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AuditLogFilterValues } from "@/components/audit/audit-log-filters";
import { AuditLogFilters } from "@/components/audit/audit-log-filters";
import type { AuditLogEntry } from "@/components/audit/audit-log-table";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { PermissionGate } from "@/components/PermissionGate";
import { queryKeys } from "@/lib/query-keys";

interface AuditLogResponse {
  logs: AuditLogEntry[];
  nextCursor: string | null;
}

function buildQuery(filters: AuditLogFilterValues, cursor: string | null): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value));
  }
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function fetchAuditLogs(
  filters: AuditLogFilterValues,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<AuditLogResponse> {
  const res = await fetch(`/api/audit-logs${buildQuery(filters, cursor)}`, { signal });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as AuditLogResponse;
}

export default function AuditLogPage() {
  const t = useTranslations("settings.auditLog");
  // Pure UI input state (the filter form) stays local — not server cache. It is
  // folded into the query key so that changing filters refetches from page one.
  const [filters, setFilters] = useState<AuditLogFilterValues>({});

  // Cursor pagination via useInfiniteQuery: first page starts at a null cursor,
  // each page's `nextCursor` drives both `fetchNextPage` and `hasNextPage`.
  // Filters are part of the key so a new filter set is a distinct cache entry.
  const logsQuery = useInfiniteQuery({
    queryKey: [...queryKeys.auditLog.list(), filters] as const,
    queryFn: ({ pageParam, signal }) => fetchAuditLogs(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Flatten the loaded pages into the contiguous list the table expects —
  // equivalent to the old append-on-loadMore behaviour.
  const logs = logsQuery.data?.pages.flatMap((page) => page.logs) ?? [];
  const error = logsQuery.error
    ? logsQuery.error instanceof Error
      ? logsQuery.error.message
      : "Unknown error"
    : null;

  return (
    <PermissionGate
      require="audit_log:read"
      fallback={
        <div className="rounded-[var(--radius-lg)] border border-border p-6 text-sm text-muted-foreground">
          {t("forbidden")}
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <AuditLogFilters onChange={setFilters} />

        {error ? (
          <div className="rounded-[var(--radius-md)] border border-red-700/30 bg-red-200 p-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <AuditLogTable logs={logs} isLoading={logsQuery.isPending && logs.length === 0} />

        {logsQuery.hasNextPage ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void logsQuery.fetchNextPage()}
              disabled={logsQuery.isFetchingNextPage}
              className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {logsQuery.isFetchingNextPage ? t("loading") : t("loadMore")}
            </button>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
