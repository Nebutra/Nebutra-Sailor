import {
  type ColumnPinningState,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/* eslint-disable react-hooks/incompatible-library */

import type { CSSProperties } from "react";
import type { DataTableProps } from "../types";
import { getFilterValue, getPinnedStyles } from "../utils";
import { useCellSelection } from "./use-cell-selection";

const EMPTY_ARRAY: any[] = [];

export function useDataTable<TData>(props: DataTableProps<TData>) {
  const {
    columns,
    data,
    searchPlaceholder,
    filterableColumns = EMPTY_ARRAY,
    enableColumnVisibility: _enableColumnVisibility = true,
    noResultsMessage,
    defaultPinning,
    enableVirtualization = false,
    virtualizeThreshold = 200,
    estimatedRowHeight = 44,
    enableRowMeasurement = false,
    columnPresets,
    columnResizeMode = "onChange",
    enableCellSelection = false,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>(
    {} as ColumnSizingInfoState,
  );
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    defaultPinning ?? { left: [], right: [] },
  );
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [scrollIndicators, setScrollIndicators] = useState({
    left: false,
    right: false,
  });
  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const resolvedSearchPlaceholder = searchPlaceholder ?? "Search...";
  const resolvedNoResultsMessage = noResultsMessage ?? "No results found.";
  const collator = useMemo(() => new Intl.Collator("en-US"), []);

  const derivedFilters = useMemo(() => {
    return filterableColumns.map((filter) => {
      if (filter.options && filter.options.length > 0) {
        return filter;
      }

      const getGroup = (row: TData) => {
        if ("groupAccessorFn" in filter && filter.groupAccessorFn) {
          return filter.groupAccessorFn(row);
        }
        if ("groupAccessorKey" in filter && filter.groupAccessorKey) {
          const val = (row as any)[filter.groupAccessorKey];
          return typeof val === "string" ? val : String(val ?? "");
        }
        return undefined;
      };

      const valueMap = new Map<string, { value: string; group?: string }>();

      for (const row of data) {
        const value = getFilterValue(filter, row);
        if (value) {
          const group = getGroup(row);
          valueMap.set(value, { value, group });
        }
      }

      const options = Array.from(valueMap.values())
        .sort((a, b) => {
          if (a.group && b.group && a.group !== b.group) {
            return collator.compare(a.group, b.group);
          }
          return collator.compare(a.value, b.value);
        })
        .map((item) => ({ value: item.value, label: item.value, group: item.group }));

      return {
        ...filter,
        options,
      };
    });
  }, [collator, data, filterableColumns]);

  const filteredData = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();

    return data.filter((row) => {
      const filterPassed = derivedFilters.every((filter) => {
        const selections = columnFilters[filter.id];
        if (!selections || selections.size === 0) {
          return true;
        }
        const value = getFilterValue(filter, row);
        return selections.has(value);
      });

      if (!filterPassed) return false;

      if (!query) return true;

      return Object.values(row as Record<string, unknown>).some((val) => {
        if (typeof val === "string") return val.toLowerCase().includes(query);
        if (typeof val === "number") return String(val).includes(query);
        if (typeof val === "boolean" && val) return query === "true" || query === "yes";
        if (typeof val === "boolean" && !val) return query === "false" || query === "no";
        return false;
      });
    });
  }, [columnFilters, data, derivedFilters, debouncedSearchQuery]);

  const updateScrollIndicators = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    const threshold = 8;
    const nextIndicators = {
      left: scrollLeft > threshold,
      right: scrollLeft + clientWidth < scrollWidth - threshold,
    };
    setScrollIndicators((prev) =>
      prev.left === nextIndicators.left && prev.right === nextIndicators.right
        ? prev
        : nextIndicators,
    );
  }, []);

  const updateScrollContainerWidth = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const width = element.clientWidth;
    setScrollContainerWidth((prev) => (prev === width ? prev : width));
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    updateScrollContainerWidth();
    const element = scrollContainerRef.current;
    if (!element) return;

    const handleScroll = () => {
      updateScrollIndicators();
    };

    element.addEventListener("scroll", handleScroll);
    const resizeObserver = new ResizeObserver(() => {
      updateScrollIndicators();
      updateScrollContainerWidth();
    });
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators, updateScrollContainerWidth]);

  useEffect(() => {
    updateScrollIndicators();
  }, [updateScrollIndicators]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnSizing,
      columnSizingInfo,
    },
    columnResizeMode,
    enableSortingRemoval: false,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const cellSelection = useCellSelection({ table, t, enabled: enableCellSelection });

  const derivedPresets = columnPresets?.length
    ? columnPresets
    : [
        {
          label: t("common.table.coreFields"),
          columns: table
            .getAllLeafColumns()
            .slice(0, 10)
            .map((column) => column.id),
        },
        { label: t("common.table.allFields"), columns: [] },
      ];

  const shouldVirtualize = enableVirtualization && filteredData.length > virtualizeThreshold;
  const shouldMeasureRows = shouldVirtualize && enableRowMeasurement;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? table.getRowModel().rows.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  });

  const virtualRows = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = shouldVirtualize && virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    shouldVirtualize && virtualRows.length > 0
      ? (rowVirtualizer.getTotalSize?.() ?? 0) - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  const rowModelRows = table.getRowModel().rows;
  const tableWidth = table.getTotalSize();
  const tableDisplayWidth =
    scrollContainerWidth > 0 ? Math.max(tableWidth, scrollContainerWidth) : tableWidth;

  const handleFilterChange = (filterId: string, value: string, checked: boolean) => {
    setColumnFilters((prev) => {
      const next = new Set(prev[filterId] ? Array.from(prev[filterId]) : []);
      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }

      const updated = { ...prev };
      if (next.size === 0) {
        delete updated[filterId];
      } else {
        updated[filterId] = next;
      }
      return updated;
    });
  };
  const clearFilters = useCallback(() => {
    setColumnFilters((prev) => (Object.keys(prev).length ? {} : prev));
    setFilterSearch((prev) => (Object.keys(prev).length ? {} : prev));
    setSearchQuery((prev) => (prev ? "" : prev));
  }, []);

  const pinnedColumnStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    table.getAllLeafColumns().forEach((column) => {
      styles[column.id] = getPinnedStyles(column);
    });
    return styles;
  }, [table]);

  const applyPreset = (columnsToShow: string[]) => {
    const desired = new Set(columnsToShow);
    const nextVisibility: VisibilityState = {};
    table.getAllLeafColumns().forEach((column) => {
      nextVisibility[column.id] = desired.size === 0 ? true : desired.has(column.id);
    });
    setColumnVisibility(nextVisibility);
  };

  const handleCopyVisibleData = async () => {
    const visibleColumns = table.getAllLeafColumns().filter((column) => column.getIsVisible());

    if (visibleColumns.length === 0) {
      toast.error(t("common.table.copyUnavailable"));
      return;
    }

    const headerLookup = new Map<string, string>();
    table.getHeaderGroups().forEach((headerGroup) => {
      headerGroup.headers.forEach((header: any) => {
        if (header.isPlaceholder) return;
        const rendered = flexRender(header.column.columnDef.header, header.getContext());
        headerLookup.set(
          header.column.id,
          typeof rendered === "string" ? rendered : header.column.id,
        );
      });
    });

    const headerLine = visibleColumns
      .map((column) => headerLookup.get(column.id) ?? column.id)
      .join("\t");

    const lines = table.getRowModel().rows.map((row) =>
      visibleColumns
        .map((column) => {
          const cell = row.getValue(column.id);
          if (cell === null || cell === undefined) return "";
          if (typeof cell === "string") return cell;
          if (typeof cell === "number" || typeof cell === "boolean") {
            return String(cell);
          }
          return JSON.stringify(cell);
        })
        .join("\t"),
    );

    const text = [headerLine, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.table.copySuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("common.table.copyError"));
    }
  };

  const handleCellCopy = async (value: any) => {
    if (value === undefined || value === null) return;
    const text =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.table.cellCopySuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("common.table.cellCopyError"));
    }
  };

  const totalRows = data.length;
  const visibleRows = filteredData.length;
  const visibleColumnsCount = table.getVisibleLeafColumns().length;

  return {
    table,
    state: {
      searchQuery,
      setSearchQuery,
      filterSearch,
      setFilterSearch,
      presetMenuOpen,
      setPresetMenuOpen,
      scrollIndicators,
      columnFilters,
    },
    refs: {
      scrollContainerRef,
    },
    virtualization: {
      rowVirtualizer,
      shouldVirtualize,
      shouldMeasureRows,
      virtualRows,
      paddingTop,
      paddingBottom,
      rowModelRows,
    },
    helpers: {
      handleFilterChange,
      clearFilters,
      applyPreset,
      handleCopyVisibleData,
      handleCellCopy,
      cellSelection: enableCellSelection ? cellSelection : undefined,
    },
    data: {
      derivedFilters,
      derivedPresets,
      visibleRows,
      totalRows,
      visibleColumnsCount,
      pinnedColumnStyles,
      resolvedSearchPlaceholder,
      resolvedNoResultsMessage,
      tableDisplayWidth,
    },
    t,
  };
}
