"use client";

import { flexRender } from "@tanstack/react-table";
import { MemoizedDataTableRow } from "./components/data-table-row";
import { DataTableToolbar } from "./components/data-table-toolbar";
import { useDataTable } from "./hooks/use-data-table";
import type { DataTableProps } from "./types";
import { getPinnedStyles } from "./utils";

export function DataTable<TData>(props: DataTableProps<TData>) {
  const {
    showToolbar = true,
    enableColumnVisibility = true,
    extraActions,
    resizeColumnLabel = "Resize column",
  } = props;

  const { table, state, refs, virtualization, helpers, data: tableData, t } = useDataTable(props);
  const { scrollContainerRef } = refs;

  const { scrollIndicators } = state;

  const { pinnedColumnStyles, resolvedNoResultsMessage, tableDisplayWidth } = tableData;

  const { handleCellCopy, cellSelection } = helpers;

  const {
    rowVirtualizer,
    shouldVirtualize,
    shouldMeasureRows,
    virtualRows,
    paddingTop,
    paddingBottom,
    rowModelRows,
  } = virtualization;

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <DataTableToolbar
          table={table}
          state={state}
          tableData={tableData}
          helpers={helpers}
          enableColumnVisibility={enableColumnVisibility}
          extraActions={extraActions}
          t={t}
        />
      ) : null}

      <div className="rounded-[var(--radius-xl)] border border-border bg-card shadow-inner overflow-hidden">
        <div className="relative">
          <div ref={scrollContainerRef} className="max-h-[60vh] overflow-auto">
            <table
              className="min-w-[900px] table-fixed caption-bottom text-sm"
              style={{ width: tableDisplayWidth }}
            >
              <thead className="sticky top-0 z-10 bg-muted [&_tr]:border-b shadow-header-sticky">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map((header) => {
                      const isGroupHeader =
                        Array.isArray(
                          (header.column.columnDef as { columns?: unknown[] }).columns,
                        ) &&
                        ((header.column.columnDef as { columns?: unknown[] }).columns?.length ??
                          0) > 0;
                      const pinnedStyle = getPinnedStyles(header.column);
                      const isPinned = header.column.getIsPinned();
                      const zIndex = isPinned ? 20 : 10;
                      const headerMeta =
                        (header.column.columnDef.meta as { headerClassName?: string }) ?? {};
                      const colorClass = headerMeta.headerClassName;
                      const defaultColorClass = isPinned
                        ? "bg-card text-muted-foreground"
                        : "bg-muted text-muted-foreground";
                      const appliedColorClass = colorClass ?? defaultColorClass;
                      return (
                        <th
                          key={header.id}
                          className={`group relative select-none border-b border-border px-4 py-4 text-left text-xs font-semibold align-middle whitespace-nowrap overflow-hidden ${appliedColorClass}`}
                          style={{
                            width: isGroupHeader ? undefined : header.getSize(),
                            minWidth: isGroupHeader ? undefined : header.getSize(),
                            maxWidth: isGroupHeader ? undefined : header.getSize(),
                            zIndex,
                            ...pinnedStyle,
                          }}
                        >
                          <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: " ↑",
                              desc: " ↓",
                            }[header.column.getIsSorted() as string] ?? null}
                          </button>
                          {header.column.getCanResize() ? (
                            <button
                              type="button"
                              aria-label={resizeColumnLabel}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onDoubleClick={() => header.column.resetSize()}
                              className={`absolute -right-1 top-0 h-full w-2 cursor-col-resize select-none touch-none transition ${
                                header.column.getIsResizing()
                                  ? "bg-primary"
                                  : "bg-transparent group-hover:bg-primary/50"
                              }`}
                            />
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {shouldVirtualize && paddingTop > 0 ? (
                  <tr className="pointer-events-none border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="h-0 p-0 align-middle whitespace-nowrap"
                      style={{ height: `${paddingTop}px` }}
                    />
                  </tr>
                ) : null}
                {(shouldVirtualize ? virtualRows : rowModelRows).length ? (
                  shouldVirtualize ? (
                    virtualRows.map((virtualRow) => {
                      const row = rowModelRows[virtualRow.index];
                      if (!row) return null;

                      return (
                        <MemoizedDataTableRow
                          key={row.id}
                          row={row}
                          virtualRow={virtualRow}
                          pinnedColumnStyles={pinnedColumnStyles}
                          t={t}
                          handleCellCopy={handleCellCopy}
                          shouldMeasure={shouldMeasureRows}
                          measureElement={rowVirtualizer.measureElement}
                          cellSelection={cellSelection}
                        />
                      );
                    })
                  ) : (
                    rowModelRows.map((row) => (
                      <MemoizedDataTableRow
                        key={row.id}
                        row={row}
                        virtualRow={undefined}
                        pinnedColumnStyles={pinnedColumnStyles}
                        t={t}
                        handleCellCopy={handleCellCopy}
                        shouldMeasure={shouldMeasureRows}
                        measureElement={rowVirtualizer.measureElement}
                        cellSelection={cellSelection}
                      />
                    ))
                  )
                ) : (
                  <tr className="border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="h-24 text-center text-sm text-muted-foreground p-2 align-middle whitespace-nowrap"
                    >
                      {resolvedNoResultsMessage}
                    </td>
                  </tr>
                )}
                {shouldVirtualize && paddingBottom > 0 ? (
                  <tr className="pointer-events-none border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="h-0 p-0 align-middle whitespace-nowrap"
                      style={{ height: `${paddingBottom}px` }}
                    />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {scrollIndicators.left ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-card via-card/80 to-transparent" />
          ) : null}
          {scrollIndicators.right ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-card via-card/80 to-transparent" />
          ) : null}
        </div>
      </div>
      <p className="pt-2 text-xs text-muted-foreground">{t("common.table.tip")}</p>
    </div>
  );
}
