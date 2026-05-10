"use client";

import { flexRender } from "@tanstack/react-table";
import { MemoizedDataTableRow } from "./components/data-table-row";
import { DataTableToolbar } from "./components/data-table-toolbar";
import { useDataTable } from "./hooks/use-data-table";
import type { DataTableProps } from "./types";
import { getPinnedStyles } from "./utils";

export function DataTable<TData>(props: DataTableProps<TData>) {
  const { showToolbar = true, enableColumnVisibility = true, extraActions } = props;

  const { table, state, refs, virtualization, helpers, data: tableData, t } = useDataTable(props);

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

      <div className="rounded-xl border border-slate-200 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="relative">
          <div
            // eslint-disable-next-line react-hooks/refs
            ref={refs.scrollContainerRef}
            className="max-h-[60vh] overflow-auto"
          >
            <table
              className="min-w-[900px] table-fixed caption-bottom text-sm"
              style={{ width: tableDisplayWidth }}
            >
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 [&_tr]:border-b shadow-header-sticky">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-slate-200">
                    {headerGroup.headers.map((header) => {
                      const isGroupHeader =
                        Array.isArray((header.column.columnDef as { columns?: any[] }).columns) &&
                        ((header.column.columnDef as { columns?: any[] }).columns?.length ?? 0) > 0;
                      const pinnedStyle = getPinnedStyles(header.column);
                      const isPinned = header.column.getIsPinned();
                      const zIndex = isPinned ? 20 : 10;
                      const headerMeta =
                        (header.column.columnDef.meta as { headerClassName?: string }) ?? {};
                      const colorClass = headerMeta.headerClassName;
                      const defaultColorClass = isPinned
                        ? "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        : "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-200";
                      const appliedColorClass = colorClass ?? defaultColorClass;
                      return (
                        <th
                          key={header.id}
                          className={`group relative select-none border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold dark:border-slate-700 align-middle whitespace-nowrap overflow-hidden ${appliedColorClass}`}
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
                              aria-label="Resize column"
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onDoubleClick={() => header.column.resetSize()}
                              className={`absolute -right-1 top-0 h-full w-2 cursor-col-resize select-none touch-none transition ${
                                header.column.getIsResizing()
                                  ? "bg-blue-400"
                                  : "bg-transparent group-hover:bg-blue-300/70"
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
                  <tr
                    aria-hidden
                    className="pointer-events-none border-b border-slate-200 hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors"
                  >
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="h-0 p-0 align-middle whitespace-nowrap"
                      style={{ height: `${paddingTop}px` }}
                    />
                  </tr>
                ) : null}
                {(shouldVirtualize ? virtualRows : rowModelRows).length ? (
                  (shouldVirtualize ? virtualRows : rowModelRows).map((item) => {
                    const rowIndex = shouldVirtualize ? (item as any).index : (item as any).index;
                    const row = rowModelRows[rowIndex];
                    if (!row) return null;

                    return (
                      <MemoizedDataTableRow
                        key={row.id}
                        row={row}
                        virtualRow={shouldVirtualize ? (item as any) : null}
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
                  <tr className="border-b border-slate-200 hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="h-24 text-center text-sm text-slate-500 p-2 align-middle whitespace-nowrap"
                    >
                      {resolvedNoResultsMessage}
                    </td>
                  </tr>
                )}
                {shouldVirtualize && paddingBottom > 0 ? (
                  <tr
                    aria-hidden
                    className="pointer-events-none border-b border-slate-200 hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors"
                  >
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
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" />
          ) : null}
          {scrollIndicators.right ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" />
          ) : null}
        </div>
      </div>
      <p className="pt-2 text-xs text-slate-400 dark:text-slate-500">{t("common.table.tip")}</p>
    </div>
  );
}
