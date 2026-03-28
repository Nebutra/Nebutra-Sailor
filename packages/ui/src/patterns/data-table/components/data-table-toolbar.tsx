import type { Table } from "@tanstack/react-table";
import { Copy, ListFilter, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../../../primitives/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../primitives/dropdown-menu";
import { Input } from "../../../primitives/input";
import type { DataTableFilter } from "../types";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  state: {
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filterSearch: Record<string, string>;
    setFilterSearch: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    presetMenuOpen: boolean;
    setPresetMenuOpen: (open: boolean) => void;
    columnFilters: Record<string, Set<string>>;
  };
  tableData: {
    derivedFilters: (DataTableFilter<TData> & { options?: any[] })[];
    derivedPresets: { label: string; columns: string[] }[];
    visibleRows: number;
    totalRows: number;
    visibleColumnsCount: number;
    resolvedSearchPlaceholder: string;
  };
  helpers: {
    handleFilterChange: (filterId: string, value: string, checked: boolean) => void;
    clearFilters: () => void;
    applyPreset: (columnsToShow: string[]) => void;
    handleCopyVisibleData: () => Promise<void>;
  };
  enableColumnVisibility: boolean;
  extraActions?: ReactNode;
  t: any;
}

export function DataTableToolbar<TData>({
  table,
  state,
  tableData,
  helpers,
  enableColumnVisibility,
  extraActions,
  t,
}: DataTableToolbarProps<TData>) {
  const { searchQuery, setSearchQuery, presetMenuOpen, setPresetMenuOpen, columnFilters } = state;

  const {
    derivedFilters,
    derivedPresets,
    visibleRows,
    totalRows,
    visibleColumnsCount,
    resolvedSearchPlaceholder,
  } = tableData;

  const { handleFilterChange, clearFilters, applyPreset, handleCopyVisibleData } = helpers;

  const hasActiveControls = searchQuery.trim().length > 0 || Object.keys(columnFilters).length > 0;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={resolvedSearchPlaceholder}
              className="pl-9"
            />
          </div>

          {derivedFilters.map((filter) => (
            <DataTableFacetedFilter
              key={filter.id}
              title={filter.title}
              options={filter.options ?? []}
              selected={columnFilters[filter.id] ?? new Set()}
              onSelectionChange={(value, checked) => handleFilterChange(filter.id, value, checked)}
              t={t}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900/70">
            {t("common.table.summary", { visible: visibleRows, total: totalRows })}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900/70">
            {t("common.table.columnSummary", { count: visibleColumnsCount })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {extraActions}
        <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyVisibleData}>
          <Copy className="size-4" />
          {t("common.table.copyView")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={clearFilters}
          disabled={!hasActiveControls}
        >
          {t("common.table.clearFilters")}
        </Button>

        <DropdownMenu open={presetMenuOpen} onOpenChange={setPresetMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {t("common.table.presets")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-2">
            {derivedPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => {
                  applyPreset(preset.columns);
                  setPresetMenuOpen(false);
                }}
                className="text-xs"
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {enableColumnVisibility ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ListFilter className="size-4" />
                {t("common.table.columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              {table.getAllLeafColumns().map((column) => {
                const headerLabel =
                  column.columnDef.header && typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id;
                const pinState = column.getIsPinned();
                const pinLeftActive = pinState === "left";
                const pinRightActive = pinState === "right";
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked)}
                    className="flex items-start justify-between gap-3 text-xs capitalize"
                  >
                    <span
                      className="flex-1 whitespace-normal break-words leading-tight"
                      title={headerLabel}
                    >
                      {headerLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`rounded border px-2 py-0.5 text-2xs uppercase transition ${
                          pinLeftActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        }`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          column.pin(pinLeftActive ? false : "left");
                        }}
                        title={t("common.table.pinLeft")}
                      >
                        L
                      </button>
                      <button
                        type="button"
                        className={`rounded border px-2 py-0.5 text-2xs uppercase transition ${
                          pinRightActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        }`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          column.pin(pinRightActive ? false : "right");
                        }}
                        title={t("common.table.pinRight")}
                      >
                        R
                      </button>
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
