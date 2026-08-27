"use client";

import { Badge, DataList, type DataListColumn } from "@nebutra/ui/primitives";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

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
  /**
   * A background refetch — a filter change or an appended page. Deliberately
   * not `isLoading`: mounted rows must not unmount underneath the reader.
   */
  isRefreshing?: boolean | undefined;
  /**
   * Failure copy for the list body. The page owns the message because it owns
   * the query; the list owns where the message appears, so a failed fetch can
   * no longer collapse this surface to zero height.
   *
   * Copy is passed in rather than read from `settings.auditLog` because this
   * namespace has no error/retry keys yet and locale files are not editable
   * from here. Until the page supplies them, DataList's own defaults show.
   */
  error?: ReactNode | undefined;
  errorTitle?: ReactNode | undefined;
  retryLabel?: string | undefined;
  onRetry?: (() => void) | undefined;
}

/**
 * Outcome pill styling.
 *
 * `success` and `pending` are subtle tints with a coloured label: `--success`
 * clears AA as a foreground in both themes (5.14:1 light, 7.3:1 dark), and
 * `--warning-strong` (5.17:1 light, 7.98:1 dark) is the amber foreground —
 * `--warning` itself is a 2.04:1 fill and must never carry text.
 *
 * `failure` is the one solid pill. There is no `--destructive-strong`, and in
 * dark mode `--destructive` is `0 63% 38%` ≈ 2.5:1 on the dark surface, i.e.
 * fill-only. The solid variant pairs it with `--destructive-foreground`, which
 * is AA by construction in both themes. A `red-subtle` tint with destructive
 * text would fail AA in dark, so the emphasis mismatch is the correct trade.
 */
function outcomeBadgeProps(outcome: string | null): {
  variant: "green-subtle" | "amber-subtle" | "destructive" | "gray-subtle";
  className?: string;
} {
  switch (outcome) {
    case "success":
      return { variant: "green-subtle" };
    case "failure":
      return { variant: "destructive" };
    case "pending":
      return { variant: "amber-subtle", className: "text-[hsl(var(--warning-strong))]" };
    default:
      return { variant: "gray-subtle" };
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

export function AuditLogTable({
  logs,
  isLoading,
  isRefreshing = false,
  error,
  errorTitle,
  retryLabel,
  onRetry,
}: AuditLogTableProps) {
  const t = useTranslations("settings.auditLog");
  const format = useFormatter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = useMemo<readonly DataListColumn<AuditLogEntry>[]>(
    () => [
      {
        id: "when",
        header: t("columns.when"),
        loadingWidth: "70%",
        cell: (log) => {
          const parsed = new Date(log.createdAt);
          return (
            // The row itself is the toggle — DataList makes it focusable and
            // Enter/Space-operable through `onRowClick`. DataList has no
            // per-row attribute hook, so the row's test id rides on the first
            // cell; a click here bubbles to the row handler unchanged.
            <span
              data-testid={`audit-row-${log.id}`}
              data-state={expandedId === log.id ? "expanded" : "collapsed"}
              className="truncate text-foreground"
              title={log.createdAt}
            >
              {Number.isNaN(parsed.getTime()) ? log.createdAt : format.relativeTime(parsed)}
            </span>
          );
        },
      },
      {
        id: "actor",
        header: t("columns.actor"),
        cellClassName: "text-muted-foreground",
        cell: (log) => <span className="truncate">{log.userId ?? log.actorType ?? "—"}</span>,
      },
      {
        id: "action",
        header: t("columns.action"),
        loadingWidth: "80%",
        cell: (log) => (
          <span className="truncate font-mono text-xs text-foreground">{log.action}</span>
        ),
      },
      {
        id: "entity",
        header: t("columns.entity"),
        cellClassName: "text-muted-foreground",
        cell: (log) => <span className="truncate">{log.entityType}</span>,
      },
      {
        id: "outcome",
        header: t("columns.outcome"),
        loadingWidth: 64,
        cell: (log) => {
          const { variant, className } = outcomeBadgeProps(log.outcome);
          return (
            <Badge
              data-testid={`outcome-pill-${log.id}`}
              size="sm"
              variant={variant}
              {...(className === undefined ? {} : { className })}
            >
              {log.outcome ?? "—"}
            </Badge>
          );
        },
      },
      {
        id: "ip",
        header: t("columns.ip"),
        loadingWidth: "50%",
        cellClassName: "text-muted-foreground",
        cell: (log) => <span className="truncate font-mono text-xs">{log.ipAddress ?? "—"}</span>,
      },
    ],
    [t, format, expandedId],
  );

  const expanded = expandedId === null ? null : (logs.find((log) => log.id === expandedId) ?? null);

  return (
    <div className="space-y-3">
      <DataList<AuditLogEntry>
        label={t("title")}
        columns={columns}
        rows={logs}
        getRowKey={(log) => log.id}
        {...(isLoading ? { status: "loading" as const } : {})}
        isRefreshing={isRefreshing}
        {...(error === undefined ? {} : { error })}
        {...(errorTitle === undefined ? {} : { errorTitle })}
        {...(retryLabel === undefined ? {} : { retryLabel })}
        {...(onRetry === undefined ? {} : { onRetry })}
        emptyTitle={t("empty")}
        onRowClick={(log) => setExpandedId((current) => (current === log.id ? null : log.id))}
        // The state hooks the tests read. DataList owns a single container and
        // that container now carries the state, so the id names the state
        // rather than a wrapper element that only exists in one state.
        data-testid={isLoading ? "audit-skeleton" : logs.length === 0 ? "audit-empty" : "audit-log"}
      />

      {/*
        The old markup nested the diff in a `colSpan` <tr>. DataList exposes no
        detail-row slot, so the panel is a disclosure region beneath the list.
        A two-column JSON diff reads better at full width than at one column's
        share, and the table body stays homogeneous — every row is one row.
      */}
      {expanded === null ? null : (
        <div
          data-testid={`audit-diff-${expanded.id}`}
          className="rounded-[var(--radius-lg)] bg-muted/40 p-4"
        >
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-mono text-xs text-foreground">{expanded.action}</span>
            <span className="text-xs text-muted-foreground">{expanded.entityType}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                {t("diff.oldValue")}
              </h4>
              <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-background p-2 text-xs">
                {safeStringify(expanded.oldValue)}
              </pre>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                {t("diff.newValue")}
              </h4>
              <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-background p-2 text-xs">
                {safeStringify(expanded.newValue)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
