import type { ColumnDef, ColumnPinningState } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type DataTableFilter<TData> =
  | {
      id: string;
      title: string;
      accessorFn: (row: TData) => string;
      groupAccessorFn?: (row: TData) => string;
      options?: Array<{ label: string; value: string; group?: string }>;
    }
  | {
      id: string;
      title: string;
      accessorKey: keyof TData & string;
      groupAccessorKey?: keyof TData & string;
      options?: Array<{ label: string; value: string; group?: string }>;
    };

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  showToolbar?: boolean;
  searchPlaceholder?: string;
  filterableColumns?: Array<DataTableFilter<TData>>;
  enableColumnVisibility?: boolean;
  noResultsMessage?: string;
  defaultPinning?: ColumnPinningState;
  enableVirtualization?: boolean;
  virtualizeThreshold?: number;
  estimatedRowHeight?: number;
  enableRowMeasurement?: boolean;
  extraActions?: ReactNode;
  columnPresets?: Array<{ label: string; columns: string[] }>;
  columnResizeMode?: "onChange" | "onEnd";
  /** Enable drag/click multi-cell selection & copy shortcuts */
  enableCellSelection?: boolean;
};
