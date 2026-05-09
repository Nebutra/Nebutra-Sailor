"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";

export interface AuditLogEntry {
  id: string;
  organizationId: string | null;
  userId: string | null;
  actorType: string | null;
  action: string;
  outcome: string | null;
  reason: string | null;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  isLoading: boolean;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function outcomePillClass(outcome: string | null): string {
  switch (outcome) {
    case "success":
      return "bg-green-100 text-green-800 border-green-200";
    case "failure":
      return "bg-red-100 text-red-800 border-red-200";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const t = useTranslations("settings.auditLog");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div data-testid="audit-skeleton" className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            key={i}
            className="h-12 animate-pulse rounded-md bg-[var(--neutral-3)]"
          />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        data-testid="audit-empty"
        className="rounded-lg border border-dashed border-[var(--neutral-7)] p-12 text-center text-sm text-[var(--neutral-11)]"
      >
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--neutral-7)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--neutral-7)] bg-[var(--neutral-2)] text-left text-xs uppercase tracking-wide text-[var(--neutral-11)]">
          <tr>
            <th className="px-4 py-3 font-medium">{t("columns.when")}</th>
            <th className="px-4 py-3 font-medium">{t("columns.actor")}</th>
            <th className="px-4 py-3 font-medium">{t("columns.action")}</th>
            <th className="px-4 py-3 font-medium">{t("columns.entity")}</th>
            <th className="px-4 py-3 font-medium">{t("columns.outcome")}</th>
            <th className="px-4 py-3 font-medium">{t("columns.ip")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--neutral-6)]">
          {logs.map((log) => {
            const expanded = expandedId === log.id;
            return (
              <Fragment key={log.id}>
                <tr
                  data-testid={`audit-row-${log.id}`}
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                  className="cursor-pointer hover:bg-[var(--neutral-2)]"
                >
                  <td className="px-4 py-3 text-[var(--neutral-12)]" title={log.createdAt}>
                    {formatRelative(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-11)]">
                    {log.userId ?? log.actorType ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--neutral-12)]">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-11)]">{log.entityType}</td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`outcome-pill-${log.id}`}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${outcomePillClass(log.outcome)}`}
                    >
                      {log.outcome ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--neutral-11)]">
                    {log.ipAddress ?? "—"}
                  </td>
                </tr>
                {expanded ? (
                  <tr className="bg-[var(--neutral-2)]">
                    <td colSpan={6} className="px-4 py-4">
                      <div
                        data-testid={`audit-diff-${log.id}`}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2"
                      >
                        <div>
                          <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--neutral-11)]">
                            {t("diff.oldValue")}
                          </h4>
                          <pre className="overflow-x-auto rounded border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 text-xs">
                            {safeStringify(log.oldValue)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--neutral-11)]">
                            {t("diff.newValue")}
                          </h4>
                          <pre className="overflow-x-auto rounded border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 text-xs">
                            {safeStringify(log.newValue)}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
