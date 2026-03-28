import { flexRender, type Row } from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";
import { type CSSProperties, memo } from "react";
import type { UseCellSelectionReturn } from "../hooks/use-cell-selection";

export interface DataTableRowProps<TData> {
  row: Row<TData>;
  virtualRow: VirtualItem | undefined;
  pinnedColumnStyles: Record<string, CSSProperties>;
  t: any;
  handleCellCopy: (value: any) => void;
  shouldMeasure: boolean;
  measureElement: (element: Element | null) => void;
  cellSelection?: UseCellSelectionReturn;
}

function DataTableRow<TData>({
  row,
  virtualRow,
  pinnedColumnStyles,
  t,
  handleCellCopy,
  shouldMeasure,
  measureElement,
  cellSelection,
}: DataTableRowProps<TData>) {
  return (
    <tr
      data-index={virtualRow?.index}
      ref={
        shouldMeasure
          ? (node) => {
              if (node) measureElement(node);
            }
          : undefined
      }
      className="border-b border-slate-200 last:border-b-0 hover:bg-blue-50/30 dark:border-slate-800 dark:hover:bg-slate-800/50 transition-colors"
    >
      {row.getVisibleCells().map((cell) => {
        const cellValue = cell.getValue();
        const isCopyable =
          typeof cellValue === "string" ||
          typeof cellValue === "number" ||
          typeof cellValue === "boolean";
        const columnId = cell.column.id;
        const pinnedStyle = pinnedColumnStyles[columnId] || {};
        const isPinned = cell.column.getIsPinned();

        const isSelected = cellSelection?.isCellSelected(row.index, columnId) ?? false;

        return (
          <td
            key={cell.id}
            data-slot="cell-selectable"
            className={`whitespace-nowrap overflow-hidden text-ellipsis px-4 py-3 align-middle text-sm text-slate-700 dark:text-slate-200 ${
              isPinned ? "bg-white dark:bg-slate-900" : ""
            } ${
              isSelected
                ? "!bg-blue-100/70 dark:!bg-blue-900/40 outline outline-1 outline-blue-400/50 dark:outline-blue-500/50"
                : ""
            }`}
            style={{
              width: cell.column.getSize(),
              minWidth: cell.column.getSize(),
              maxWidth: cell.column.getSize(),
              ...pinnedStyle,
            }}
            title={isCopyable ? t("common.table.copyCellTooltip") : undefined}
            onDoubleClick={isCopyable ? () => handleCellCopy(cellValue) : undefined}
            onMouseDown={
              cellSelection
                ? (e) => cellSelection.onCellMouseDown(row.index, columnId, e)
                : undefined
            }
            onMouseEnter={
              cellSelection ? () => cellSelection.onCellMouseEnter(row.index, columnId) : undefined
            }
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}

export const MemoizedDataTableRow = memo(DataTableRow) as typeof DataTableRow;
