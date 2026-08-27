"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { EmptyStateRoot } from "./empty-state";
import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

/* -------------------------------------------------------------------------- *\
 *  DataList — the one shared list surface.
 *
 *  Replaces the hand-rolled <table> that had been copied across twelve screens.
 *  It owns the four things every one of those copies got subtly wrong:
 *
 *  1. A reserved body floor. `minBodyRows * rowHeight` is applied to the
 *     loading, empty AND error bodies — not only to loading — so every
 *     transition between them is jump-free.
 *  2. `isRefreshing` is NOT `status="loading"`. A background refetch or a
 *     settling optimistic mutation dims the mounted rows; it never unmounts
 *     them. Screens running optimistic mutations depend on this.
 *  3. State precedence is decided here, once: error > loading > empty > rows.
 *  4. Overflow is contained by the scroll container, so a wide table scrolls
 *     inside itself and never widens the page.
 *
 *  Separation is spacing + tonal background, never a rule: the header band is
 *  a tinted strip (the primitive's own `border-b` is overridden), TableBody's
 *  built-in 12px spacer supplies the gap beneath it, and the pagination slot
 *  is a tinted strip set off by margin.
 *
 *  The footer is an opaque `pagination` slot on purpose. It takes whatever the
 *  screen already has — href-based paging, an i18n'd control, nothing at all.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DataListStatus = "idle" | "loading" | "empty" | "error";

export type DataListAlign = "start" | "center" | "end";

export interface DataListColumn<Row> {
  /** Stable identity for the column. Used as the React key. */
  id: string;
  /** Header content. */
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: Row, index: number) => ReactNode;
  /**
   * Horizontal alignment of both the header and the cell.
   * @default "start"
   */
  align?: DataListAlign | undefined;
  /** Tabular numerals + monospace digits for figures that must line up. */
  numeric?: boolean | undefined;
  /** Column width — a number is read as px. Applied to the header cell. */
  width?: number | string | undefined;
  /** Extra classes for this column's header cell. */
  headClassName?: string | undefined;
  /** Extra classes for this column's body cells. */
  cellClassName?: string | undefined;
  /**
   * Width of the skeleton bar used for this column while loading.
   * @default "60%"
   */
  loadingWidth?: number | string | undefined;
}

export interface DataListProps<Row> {
  /** Column definitions, left to right. */
  columns: readonly DataListColumn<Row>[];
  /** The rows to render. Ignored while the resolved status is not "idle". */
  rows: readonly Row[];
  /** Stable React key per row. */
  getRowKey: (row: Row, index: number) => string;

  /**
   * Explicit state. When omitted it is derived: `error` present → "error",
   * otherwise no rows → "empty", otherwise "idle".
   * Precedence, applied here and nowhere else: error > loading > empty > rows.
   */
  status?: DataListStatus | undefined;
  /**
   * A background refetch or a settling optimistic mutation. Deliberately
   * separate from `status="loading"`: mounted rows stay mounted.
   */
  isRefreshing?: boolean | undefined;

  /**
   * Error copy. Presence alone is enough to resolve the status to "error";
   * `null` / `false` / `""` count as absence, so a `string | null` error from a
   * query hook can be passed straight through.
   */
  error?: ReactNode | undefined;
  /** Heading shown on the error body. */
  errorTitle?: ReactNode | undefined;
  /** Retry affordance rendered on the error body. */
  onRetry?: (() => void) | undefined;
  /** Label for the retry control — pass the translated string. */
  retryLabel?: string | undefined;

  /** Heading shown on the empty body. */
  emptyTitle?: ReactNode | undefined;
  /** Supporting copy shown on the empty body. */
  emptyDescription?: ReactNode | undefined;
  /** Icon shown on the empty body. Pass an `EmptyState.Icon`. */
  emptyIcon?: ReactNode | undefined;
  /** CTA rendered on the empty body. */
  emptyAction?: ReactNode | undefined;

  /**
   * Rows of height reserved for the loading, empty and error bodies.
   * @default 5
   */
  minBodyRows?: number | undefined;
  /**
   * Height in px of one reserved row. Also the height of a loading row.
   * @default 44
   */
  rowHeight?: number | undefined;

  /** Opaque footer slot — bring your own pagination control. */
  pagination?: ReactNode | undefined;

  /** Alternating row tint for scan-heavy datasets. */
  striped?: boolean | undefined;
  /** Hover/focus tint. Implied by `onRowClick`. */
  interactive?: boolean | undefined;
  /** Row activation. Rows become keyboard-operable when provided. */
  onRowClick?: ((row: Row, index: number) => void) | undefined;

  /** Accessible name for the table. */
  label?: string | undefined;
  /** Class for the outer region. */
  className?: string | undefined;
  /** Class for the scroll container. */
  scrollClassName?: string | undefined;
  /** Style for the outer region. */
  style?: CSSProperties | undefined;
  /** Test hook. */
  "data-testid"?: string | undefined;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const DEFAULT_MIN_BODY_ROWS = 5;
const DEFAULT_ROW_HEIGHT = 44;

/**
 * TableHead and TableCell both hard-code `last:text-right` at specificity
 * (0,2,0), which a flat `text-center` on the cell cannot beat. Alignment is
 * therefore carried by a child element: a specified declaration on the child
 * always outranks a value inherited from the cell, whatever the specificity of
 * the rule that produced it.
 */
const alignClassName: Record<DataListAlign, string> = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
};

function AlignedCellContent({
  align,
  className,
  children,
}: {
  align: DataListAlign;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", alignClassName[align], className)}>
      {children}
    </div>
  );
}

/**
 * Every real screen holds its error as `string | null` (the react-query shape),
 * not `string | undefined`. Testing `!== undefined` would resolve `error={null}`
 * to the error body and render it empty, so each consumer would have to spread
 * the prop conditionally. Absence is therefore anything React would not paint.
 */
function hasError(error: ReactNode): boolean {
  return error !== undefined && error !== null && error !== false && error !== "";
}

function resolveStatus<Row>(
  status: DataListStatus | undefined,
  error: ReactNode | undefined,
  rows: readonly Row[],
): DataListStatus {
  // error > loading > empty > rows — decided here, once.
  if (status === "error" || hasError(error)) return "error";
  if (status === "loading") return "loading";
  if (status === "empty" || rows.length === 0) return "empty";
  return "idle";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataList<Row>({
  columns,
  rows,
  getRowKey,
  status,
  isRefreshing = false,
  error,
  errorTitle = "Something went wrong",
  onRetry,
  retryLabel = "Try again",
  emptyTitle = "Nothing here",
  emptyDescription,
  emptyIcon,
  emptyAction,
  minBodyRows = DEFAULT_MIN_BODY_ROWS,
  rowHeight = DEFAULT_ROW_HEIGHT,
  pagination,
  striped = false,
  interactive = false,
  onRowClick,
  label,
  className,
  scrollClassName,
  style,
  "data-testid": dataTestId,
}: DataListProps<Row>) {
  const resolved = resolveStatus(status, error, rows);
  const columnCount = Math.max(columns.length, 1);

  // The reserved floor. Loading renders `minBodyRows` rows of `rowHeight`;
  // empty and error render one row whose single cell is the same product.
  // Both bodies therefore measure exactly `minBodyRows * rowHeight` — the
  // default 5 x 44 = 220px leaves ~200px of content box after the cell's 10px
  // y-padding, which comfortably holds an icon + title + description + CTA.
  // It is a floor, not a cap: an unusually tall empty state grows past it, so
  // raise `minBodyRows` rather than letting the two states disagree.
  const reservedFloor = Math.max(minBodyRows, 0) * rowHeight;
  const skeletonRowCount = Math.max(minBodyRows, 1);

  const rowsAreInteractive = interactive || onRowClick !== undefined;
  const busy = resolved === "loading" || isRefreshing;

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: Row, index: number) => {
    if (onRowClick === undefined) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRowClick(row, index);
  };

  const header = (
    <TableHeader
      // The primitive hard-codes `border-b border-border`. 呼吸感 comes from a
      // tonal band plus TableBody's own 12px spacer, not from a rule.
      className="border-b-0"
    >
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.id}
            numeric={column.numeric ?? false}
            style={column.width === undefined ? undefined : { width: column.width }}
            className={cn(
              // Cell x-padding is 8px in the primitive, which is tight once the
              // card padding is zeroed. 12px restores the rhythm.
              "bg-muted/45 px-3 text-xs uppercase tracking-[0.04em] text-muted-foreground",
              "first:rounded-l-[var(--table-row-radius)] last:rounded-r-[var(--table-row-radius)]",
              column.headClassName,
            )}
          >
            <AlignedCellContent align={column.align ?? "start"}>{column.header}</AlignedCellContent>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );

  let body: ReactNode;

  if (resolved === "error") {
    body = (
      <TableRow>
        <TableCell colSpan={columnCount} className="px-3" style={{ height: reservedFloor }}>
          <EmptyStateRoot
            live
            variant="error"
            size="sm"
            // EmptyState always carries a border; inside a borderless body it
            // has to be told to drop it. className merges last, so this wins.
            className="min-h-0 border-0 bg-destructive/5 px-4 py-4"
            title={errorTitle}
            description={error}
            {...(onRetry === undefined
              ? {}
              : {
                  action: (
                    <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                      {retryLabel}
                    </Button>
                  ),
                })}
          />
        </TableCell>
      </TableRow>
    );
  } else if (resolved === "loading") {
    body = Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
      <TableRow key={`data-list-skeleton-${rowIndex}`} aria-hidden="true">
        {columns.map((column) => (
          <TableCell key={column.id} className="px-3" style={{ height: rowHeight }}>
            <AlignedCellContent align={column.align ?? "start"}>
              <Skeleton height={12} style={{ width: column.loadingWidth ?? "60%", minWidth: 40 }} />
            </AlignedCellContent>
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (resolved === "empty") {
    body = (
      <TableRow>
        <TableCell colSpan={columnCount} className="px-3" style={{ height: reservedFloor }}>
          <EmptyStateRoot
            live
            variant="no-results"
            size="sm"
            className="min-h-0 border-0 bg-transparent px-4 py-4"
            title={emptyTitle}
            {...(emptyDescription === undefined ? {} : { description: emptyDescription })}
            {...(emptyIcon === undefined ? {} : { icon: emptyIcon })}
            {...(emptyAction === undefined ? {} : { action: emptyAction })}
          />
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((row, rowIndex) => (
      <TableRow
        key={getRowKey(row, rowIndex)}
        {...(onRowClick === undefined
          ? {}
          : {
              tabIndex: 0,
              onClick: () => onRowClick(row, rowIndex),
              onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) =>
                handleRowKeyDown(event, row, rowIndex),
            })}
        className={cn(onRowClick !== undefined && "cursor-pointer")}
      >
        {columns.map((column) => (
          <TableCell
            key={column.id}
            numeric={column.numeric ?? false}
            className={cn("px-3", column.cellClassName)}
            style={{ height: rowHeight }}
          >
            <AlignedCellContent align={column.align ?? "start"}>
              {column.cell(row, rowIndex)}
            </AlignedCellContent>
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <div
      className={cn("relative w-full min-w-0", className)}
      style={style}
      data-status={resolved}
      data-refreshing={isRefreshing ? "" : undefined}
      data-testid={dataTestId}
      aria-busy={busy || undefined}
    >
      {/* Refresh tell: a 2px shimmer that occupies no layout, so a background
          refetch cannot move a single row. */}
      {isRefreshing ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-full"
        >
          <div className="h-full w-full animate-pulse bg-primary/70 motion-reduce:animate-none" />
        </div>
      ) : null}

      <Table
        aria-label={label}
        // Zero the primitive's card chrome — only one consumer sits inside a
        // panel; the rest draw their own wrapper. `min-w-0` lets the scroll
        // container shrink, which is what keeps overflow inside the list
        // instead of widening the page.
        wrapperClassName={cn(
          "min-w-0 rounded-none border-0 bg-transparent p-0",
          resolved === "idle" &&
            isRefreshing &&
            "opacity-70 transition-opacity motion-reduce:transition-none",
          scrollClassName,
        )}
      >
        {header}
        <TableBody striped={striped} interactive={rowsAreInteractive}>
          {body}
        </TableBody>
      </Table>

      {pagination === undefined ? null : (
        <div className="mt-3 rounded-[var(--radius-md)] bg-muted/35 px-3 py-2">{pagination}</div>
      )}
    </div>
  );
}

DataList.displayName = "DataList";
