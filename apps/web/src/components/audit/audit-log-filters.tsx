"use client";

import { Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

export interface AuditLogFilterValues {
  action?: string;
  entityType?: string;
  outcome?: "success" | "failure" | "pending";
  userId?: string;
  startDate?: string;
  endDate?: string;
}

interface AuditLogFiltersProps {
  onChange: (filters: AuditLogFilterValues) => void;
}

const ENTITY_TYPES = [
  "user",
  "organization",
  "session",
  "api_key",
  "project",
  "billing",
  "webhook",
] as const;

const DEBOUNCE_MS = 300;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function emptyFilters(): AuditLogFilterValues {
  return {};
}

function pruneFilters(input: AuditLogFilterValues): AuditLogFilterValues {
  const result: AuditLogFilterValues = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function AuditLogFilters({ onChange }: AuditLogFiltersProps) {
  const t = useTranslations("settings.auditLog.filters");
  const [filters, setFilters] = useState<AuditLogFilterValues>(emptyFilters());

  const debouncedOnChange = useDebounceCallback(onChange, DEBOUNCE_MS);

  useEffect(() => {
    debouncedOnChange(pruneFilters(filters));
  }, [filters, debouncedOnChange]);

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  function setField<K extends keyof AuditLogFilterValues>(
    key: K,
    value: AuditLogFilterValues[K] | undefined,
  ) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function applyRangeDays(days: number) {
    const now = new Date();
    const start = new Date(now.getTime() - days * MS_PER_DAY);
    setFilters((prev) => ({
      ...prev,
      startDate: start.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }));
  }

  function reset() {
    setFilters(emptyFilters());
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-border bg-background p-4">
      <div className="flex flex-col">
        <label
          htmlFor="audit-filter-action"
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {t("action")}
        </label>
        <Input
          id="audit-filter-action"
          data-testid="audit-filter-action"
          type="text"
          value={filters.action ?? ""}
          onChange={(e) => setField("action", e.target.value)}
          placeholder={t("actionPlaceholder")}
        />
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="audit-filter-entity"
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {t("entityType")}
        </label>
        <select
          id="audit-filter-entity"
          data-testid="audit-filter-entity"
          data-allow-native
          value={filters.entityType ?? ""}
          onChange={(e) => setField("entityType", e.target.value || undefined)}
          className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">{t("all")}</option>
          {ENTITY_TYPES.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="audit-filter-outcome"
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {t("outcome")}
        </label>
        <select
          id="audit-filter-outcome"
          data-testid="audit-filter-outcome"
          data-allow-native
          value={filters.outcome ?? ""}
          onChange={(e) =>
            setField("outcome", (e.target.value || undefined) as AuditLogFilterValues["outcome"])
          }
          className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">{t("all")}</option>
          <option value="success">{t("outcomeSuccess")}</option>
          <option value="failure">{t("outcomeFailure")}</option>
          <option value="pending">{t("outcomePending")}</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="audit-filter-start"
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {t("startDate")}
        </label>
        <Input
          id="audit-filter-start"
          data-testid="audit-filter-start"
          type="date"
          value={filters.startDate ?? ""}
          onChange={(e) => setField("startDate", e.target.value || undefined)}
        />
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="audit-filter-end"
          className="mb-1 text-xs font-medium text-muted-foreground"
        >
          {t("endDate")}
        </label>
        <Input
          id="audit-filter-end"
          data-testid="audit-filter-end"
          type="date"
          value={filters.endDate ?? ""}
          onChange={(e) => setField("endDate", e.target.value || undefined)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="audit-filter-range-24h"
          onClick={() => applyRangeDays(1)}
          className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          {t("range24h")}
        </button>
        <button
          type="button"
          data-testid="audit-filter-range-7d"
          onClick={() => applyRangeDays(7)}
          className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          {t("range7d")}
        </button>
        <button
          type="button"
          data-testid="audit-filter-range-30d"
          onClick={() => applyRangeDays(30)}
          className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          {t("range30d")}
        </button>
        <button
          type="button"
          data-testid="audit-filter-reset"
          onClick={reset}
          className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
