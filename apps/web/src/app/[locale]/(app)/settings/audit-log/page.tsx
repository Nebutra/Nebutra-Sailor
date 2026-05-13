"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AuditLogFilterValues } from "@/components/audit/audit-log-filters";
import { AuditLogFilters } from "@/components/audit/audit-log-filters";
import type { AuditLogEntry } from "@/components/audit/audit-log-table";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { PermissionGate } from "@/components/PermissionGate";

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

export default function AuditLogPage() {
  const t = useTranslations("settings.auditLog");
  const [filters, setFilters] = useState<AuditLogFilterValues>({});
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (currentFilters: AuditLogFilterValues, cursor: string | null, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/audit-logs${buildQuery(currentFilters, cursor)}`);
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const body = (await res.json()) as AuditLogResponse;
        setLogs((prev) => (append ? [...prev, ...body.logs] : body.logs));
        setNextCursor(body.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(filters, null, false);
  }, [filters, load]);

  return (
    <PermissionGate
      require="audit_log:read"
      fallback={
        <div className="rounded-lg border border-[var(--neutral-7)] p-6 text-sm text-[var(--neutral-11)]">
          {t("forbidden")}
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--neutral-12)]">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>

        <AuditLogFilters onChange={setFilters} />

        {error ? (
          <div className="rounded-md border border-red-6 bg-red-2 p-3 text-sm text-red-11">
            {error}
          </div>
        ) : null}

        <AuditLogTable logs={logs} isLoading={isLoading && logs.length === 0} />

        {nextCursor ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void load(filters, nextCursor, true)}
              disabled={isLoading}
              className="rounded-md border border-[var(--neutral-7)] px-4 py-2 text-sm font-medium hover:bg-[var(--neutral-2)] disabled:opacity-50"
            >
              {isLoading ? t("loading") : t("loadMore")}
            </button>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
