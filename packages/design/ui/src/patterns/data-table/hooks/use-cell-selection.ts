import type { Table } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** A cell coordinate: rowIndex is from table.getRowModel().rows */
export interface CellCoord {
  rowIndex: number;
  colId: string;
}

/** The resolved rectangle of a selection */
export interface SelectionRect {
  startRow: number;
  endRow: number;
  colIds: string[];
}

export interface UseCellSelectionOptions<TData> {
  table: Table<TData>;
  t: (key: string) => string;
  enabled?: boolean;
}

export interface UseCellSelectionReturn {
  /** Whether a cell is inside the current selection rectangle */
  isCellSelected: (rowIndex: number, colId: string) => boolean;
  /** Mouse-down handler — starts a new selection */
  onCellMouseDown: (rowIndex: number, colId: string, e: React.MouseEvent) => void;
  /** Mouse-enter handler — extends the selection while dragging */
  onCellMouseEnter: (rowIndex: number, colId: string) => void;
  /** Whether a selection is currently active */
  hasSelection: boolean;
  /** Clear the selection */
  clearSelection: () => void;
  /** Copy the current selection to clipboard */
  copySelection: () => Promise<void>;
}

export function useCellSelection<TData>({
  table,
  t,
  enabled = false,
}: UseCellSelectionOptions<TData>): UseCellSelectionReturn {
  // anchor = the cell where mousedown happened
  const [anchor, setAnchor] = useState<CellCoord | null>(null);
  // current = the cell the mouse is currently hovering over (while dragging)
  const [current, setCurrent] = useState<CellCoord | null>(null);
  const anchorRef = useRef<CellCoord | null>(null);
  const currentRef = useRef<CellCoord | null>(null);
  const isDragging = useRef(false);

  // ---------- Resolve the ordered visible column list ----------
  const getVisibleColIds = useCallback((): string[] => {
    return table
      .getAllLeafColumns()
      .filter((c) => c.getIsVisible())
      .map((c) => c.id);
  }, [table]);

  // ---------- Compute the rectangular selection ----------
  const selectionRect = useMemo<SelectionRect | null>(() => {
    if (!enabled) return null;
    if (!anchor || !current) return null;
    const visibleCols = getVisibleColIds();
    const anchorColIdx = visibleCols.indexOf(anchor.colId);
    const currentColIdx = visibleCols.indexOf(current.colId);
    if (anchorColIdx === -1 || currentColIdx === -1) return null;

    const minRow = Math.min(anchor.rowIndex, current.rowIndex);
    const maxRow = Math.max(anchor.rowIndex, current.rowIndex);
    const minCol = Math.min(anchorColIdx, currentColIdx);
    const maxCol = Math.max(anchorColIdx, currentColIdx);

    return {
      startRow: minRow,
      endRow: maxRow,
      colIds: visibleCols.slice(minCol, maxCol + 1),
    };
  }, [anchor, current, enabled, getVisibleColIds]);
  const selectedColIdSet = useMemo(
    () => (selectionRect ? new Set(selectionRect.colIds) : null),
    [selectionRect],
  );

  // ---------- Check if a cell is selected ----------
  const isCellSelected = useCallback(
    (rowIndex: number, colId: string): boolean => {
      if (!enabled) return false;
      if (!selectionRect || !selectedColIdSet) return false;
      if (rowIndex < selectionRect.startRow || rowIndex > selectionRect.endRow) return false;
      return selectedColIdSet.has(colId);
    },
    [enabled, selectedColIdSet, selectionRect],
  );

  // ---------- Mouse handlers ----------
  const onCellMouseDown = useCallback(
    (rowIndex: number, colId: string, e: React.MouseEvent) => {
      if (!enabled) return;
      // Don't interfere with double-click (single cell copy)
      if (e.detail >= 2) return;
      // Only left button
      if (e.button !== 0) return;

      const coord: CellCoord = { rowIndex, colId };
      anchorRef.current = coord;
      currentRef.current = coord;
      setAnchor(coord);
      setCurrent(coord);
      isDragging.current = true;
      e.preventDefault(); // prevent text selection
    },
    [enabled],
  );

  const onCellMouseEnter = useCallback(
    (rowIndex: number, colId: string) => {
      if (!enabled) return;
      if (!isDragging.current) return;
      const prev = currentRef.current;
      if (prev && prev.rowIndex === rowIndex && prev.colId === colId) {
        return;
      }
      currentRef.current = { rowIndex, colId };
      setCurrent({ rowIndex, colId });
    },
    [enabled],
  );

  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // Global mouseup: stop dragging
  useEffect(() => {
    if (!enabled) return;
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [enabled]);

  // ---------- Clear selection ----------
  const clearSelection = useCallback(() => {
    const hasSelection = anchorRef.current !== null || currentRef.current !== null;
    if (!hasSelection && !isDragging.current) {
      return;
    }
    setAnchor(null);
    setCurrent(null);
    anchorRef.current = null;
    currentRef.current = null;
    isDragging.current = false;
  }, []);

  // Clear selection when clicking outside a table cell
  useEffect(() => {
    if (!enabled) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-slot='cell-selectable']")) {
        return;
      }
      clearSelection();
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [clearSelection, enabled]);

  // ---------- Copy selection to clipboard ----------
  const copySelection = useCallback(async () => {
    if (!enabled) return;
    if (!selectionRect) return;

    const rows = table.getRowModel().rows;
    const lines: string[] = [];
    for (let r = selectionRect.startRow; r <= selectionRect.endRow; r++) {
      const row = rows[r];
      if (!row) continue;
      const cells = selectionRect.colIds.map((colId) => {
        const val = row.getValue(colId);
        if (val === null || val === undefined) return "";
        if (typeof val === "string") return val;
        if (typeof val === "number" || typeof val === "boolean") return String(val);
        return JSON.stringify(val);
      });
      lines.push(cells.join("\t"));
    }

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      const cellCount =
        (selectionRect.endRow - selectionRect.startRow + 1) * selectionRect.colIds.length;
      toast.success(t("common.table.multiCellCopySuccess").replace("{{count}}", String(cellCount)));
    } catch (error) {
      console.error(error);
      toast.error(t("common.table.cellCopyError"));
    }
  }, [enabled, selectionRect, table, t]);

  // ---------- Keyboard shortcut: Ctrl/Cmd + C ----------
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && anchor && current) {
        // Only intercept if we have a multi-cell selection OR single cell selected in our system
        if (!selectionRect) return;
        // Check that the native Selection is empty — avoid hijacking normal copy
        const nativeSel = window.getSelection();
        if (nativeSel && nativeSel.toString().trim().length > 0) return;

        e.preventDefault();
        copySelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anchor, current, copySelection, enabled, selectionRect]);

  const hasSelection = enabled && !!(anchor && current);

  return {
    isCellSelected,
    onCellMouseDown,
    onCellMouseEnter,
    hasSelection,
    clearSelection,
    copySelection,
  };
}
