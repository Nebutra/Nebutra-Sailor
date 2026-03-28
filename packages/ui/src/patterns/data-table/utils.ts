import type { Column } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import type { DataTableFilter } from "./types";

export function getFilterValue<TData>(filter: DataTableFilter<TData>, row: TData): string {
  if ("accessorFn" in filter) {
    return filter.accessorFn(row) ?? "";
  }
  const value = (row as Record<string, unknown>)[filter.accessorKey];
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

export function getPinnedStyles<TData, TValue>(column: Column<TData, TValue>): CSSProperties {
  const isGroupHeader =
    Array.isArray((column.columnDef as { columns?: unknown[] }).columns) &&
    ((column.columnDef as { columns?: unknown[] }).columns?.length ?? 0) > 0;
  if (isGroupHeader) {
    return {};
  }

  const pinState = column.getIsPinned();
  if (!pinState) return {};
  const isLeft = pinState === "left";
  const start = column.getStart(pinState) ?? 0;
  const side: "left" | "right" = isLeft ? "left" : "right";
  const shadow = isLeft
    ? "inset -8px 0 8px -8px rgba(15, 23, 42, 0.35)"
    : "inset 8px 0 8px -8px rgba(15, 23, 42, 0.35)";
  const style: CSSProperties = {
    position: "sticky",
    zIndex: 20,
    boxShadow: shadow,
  };
  style[side] = `${start}px`;
  return style;
}
