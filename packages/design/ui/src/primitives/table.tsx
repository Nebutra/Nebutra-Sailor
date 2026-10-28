import type * as React from "react";
import { tableTokens } from "../tokens/components/table";
import { cn } from "../utils";

export type TableCssVar =
  | "--table-min-width"
  | "--table-padding"
  | "--table-radius"
  | "--table-row-radius"
  | "--table-cell-padding-x"
  | "--table-cell-padding-y"
  | "--table-header-height"
  | "--table-font-size"
  | "--table-heading-weight"
  | "--table-body-weight"
  | "--table-body-spacer"
  | "--table-motion-duration"
  | "--table-motion-easing";

/**
 * The table's density/geometry knobs, addressable by callers so a table can be
 * retuned without reaching past the primitive into raw cell classes.
 */
export type TableCssVarOverrides = Partial<Record<TableCssVar, string | number>>;

export type TableStyle = React.CSSProperties & TableCssVarOverrides;

export type TableProps = Omit<React.TableHTMLAttributes<HTMLTableElement>, "style"> & {
  /** Class applied to the scroll container around the native table. */
  wrapperClassName?: string;
  /** Style applied to the scroll container around the native table. */
  wrapperStyle?: TableStyle;
  /** Style applied to the native table element. */
  style?: TableStyle;
  /**
   * Drops the container's own card chrome — surface, border, radius, inset
   * padding, minimum width, and the header/body spacer. Use when the table is
   * already inside a panel or `Card`, so the rows sit flush with the panel edge
   * instead of being double-framed.
   */
  bare?: boolean;
};

export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  /** Alternates row background for scan-heavy datasets. */
  striped?: boolean;
  /** Adds row separators inside the body. */
  bordered?: boolean;
  /** Adds hover state for rows that open details or respond to click. */
  interactive?: boolean;
  /** Marks a truncated/virtualized body without changing native table semantics. */
  virtualize?: boolean;
};

/**
 * Explicit horizontal alignment. Setting it also opts the cell out of the
 * implicit "last column is the action column, so end-align it" rule, which a
 * plain `text-start` class cannot override — `:last-child` outranks it.
 */
export type TableCellAlignment = "start" | "center" | "end";

const ALIGNMENT_CLASS: Record<TableCellAlignment, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

export type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  /** Aligns numeric headings and applies tabular numbers. */
  numeric?: boolean;
  /** Overrides the implicit last-column right alignment. */
  alignment?: TableCellAlignment;
};

export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  /** Aligns numeric values and applies tabular numbers. */
  numeric?: boolean;
  /** Overrides the implicit last-column right alignment. */
  alignment?: TableCellAlignment;
};

type TableComponent = React.ComponentType<
  TableProps & { ref?: React.Ref<HTMLTableElement> | undefined }
> & {
  /** Table body with optional row striping, separators, and interaction feedback. */
  Body: typeof TableBody;
  /** Native caption describing the table, positioned below its rows. */
  Caption: typeof TableCaption;
  /** Body cell with optional numeric formatting and explicit horizontal alignment. */
  Cell: typeof TableCell;
  /** Native column element for sizing or styling a column inside Table.Colgroup. */
  Col: typeof TableCol;
  /** Native column group for declaring shared column sizing or styling. */
  Colgroup: typeof TableColgroup;
  /** Footer row group separated from the table body by a top border. */
  Footer: typeof TableFooter;
  /** Header cell with column scope by default and optional numeric formatting. */
  Head: typeof TableHead;
  /** Header row group separated from the table body by a bottom border. */
  Header: typeof TableHeader;
  /** Native table row with shared cell corner and transition styling. */
  Row: typeof TableRow;
};

function createTableVars(style: TableStyle | undefined, bare: boolean) {
  return {
    "--table-min-width": `${tableTokens.wrapper.minWidth}px`,
    "--table-padding": `${tableTokens.wrapper.padding}px`,
    "--table-radius": `${tableTokens.wrapper.radius}px`,
    "--table-row-radius": `${tableTokens.row.radius}px`,
    "--table-cell-padding-x": `${tableTokens.cell.paddingX}px`,
    "--table-cell-padding-y": `${tableTokens.cell.paddingY}px`,
    "--table-header-height": `${tableTokens.header.height}px`,
    "--table-font-size": `${tableTokens.typography.size}px`,
    "--table-heading-weight": tableTokens.typography.headingWeight,
    "--table-body-weight": tableTokens.typography.bodyWeight,
    "--table-body-spacer": bare ? "0px" : `${tableTokens.spacer.bodyTop}px`,
    "--table-motion-duration": `${tableTokens.motion.duration}ms`,
    "--table-motion-easing": tableTokens.motion.easing,
    ...style,
  } satisfies React.CSSProperties & Record<TableCssVar, string | number>;
}

/** Renders a native table in a scrollable container with optional card chrome. */
const TableRoot = ({
  className,
  wrapperClassName,
  wrapperStyle,
  style,
  bare = false,
  ref,
  ...props
}: TableProps & { ref?: React.Ref<HTMLTableElement> | undefined }) => (
  <div
    className={cn(
      "relative w-full overflow-auto",
      !bare &&
        "min-w-[var(--table-min-width)] rounded-[var(--table-radius)] border border-border bg-card p-[var(--table-padding)]",
      wrapperClassName,
    )}
    style={createTableVars(wrapperStyle, bare)}
  >
    <table
      ref={ref}
      className={cn(
        "w-full border-collapse caption-bottom text-[length:var(--table-font-size)] font-[var(--table-body-weight)] text-foreground",
        className,
      )}
      style={style}
      {...props}
    />
  </div>
);
TableRoot.displayName = "Table";

/** Declares a native column group for shared column sizing or styling. */
const TableColgroup = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLTableColElement> & {
  ref?: React.Ref<HTMLTableColElement> | undefined;
}) => <colgroup ref={ref} className={className} {...props} />;
TableColgroup.displayName = "TableColgroup";

/** Declares a native column inside Table.Colgroup for column sizing or styling. */
const TableCol = ({
  className,
  ref,
  ...props
}: React.ColHTMLAttributes<HTMLTableColElement> & {
  ref?: React.Ref<HTMLTableColElement> | undefined;
}) => <col ref={ref} className={className} {...props} />;
TableCol.displayName = "TableCol";

/** Groups header rows in a native thead with a bottom border. */
const TableHeader = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.Ref<HTMLTableSectionElement> | undefined;
}) => <thead ref={ref} className={cn("border-b border-border", className)} {...props} />;
TableHeader.displayName = "TableHeader";

/**
 * Groups body rows with optional striping, separators, and interaction feedback.
 * The virtualize flag adds a data marker; callers supply any virtualization behavior.
 */
const TableBody = ({
  className,
  striped = false,
  bordered = false,
  interactive = false,
  virtualize = false,
  ref,
  ...props
}: TableBodyProps & { ref?: React.Ref<HTMLTableSectionElement> | undefined }) => (
  <>
    <tbody aria-hidden="true" className="table-row h-[var(--table-body-spacer)]" />
    <tbody
      ref={ref}
      data-virtualized={virtualize ? "" : undefined}
      className={cn(
        "[&_tr:last-child]:border-b-0",
        striped && "[&_tr:where(:nth-child(odd))]:bg-muted/45",
        bordered && "[&_tr]:border-b [&_tr]:border-border",
        interactive &&
          "[&_tr]:cursor-default [&_tr:hover]:bg-muted/70 [&_tr:focus-within]:bg-muted/70",
        className,
      )}
      {...props}
    />
  </>
);
TableBody.displayName = "TableBody";

/** Groups summary or footer rows in a native tfoot with a top border. */
const TableFooter = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.Ref<HTMLTableSectionElement> | undefined;
}) => <tfoot ref={ref} className={cn("border-t border-border", className)} {...props} />;
TableFooter.displayName = "TableFooter";

/** Renders a native row with shared cell corner and transition styling. */
const TableRow = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  ref?: React.Ref<HTMLTableRowElement> | undefined;
}) => (
  <tr
    ref={ref}
    className={cn(
      "[&_td:first-child]:rounded-s-[var(--table-row-radius)] [&_td:last-child]:rounded-e-[var(--table-row-radius)] transition-colors duration-[var(--table-motion-duration)] ease-[var(--table-motion-easing)] motion-reduce:transition-none",
      className,
    )}
    {...props}
  />
);
TableRow.displayName = "TableRow";

/** Renders a column header, right-aligning the last column unless alignment is explicit. */
const TableHead = ({
  className,
  numeric = false,
  alignment,
  scope = "col",
  ref,
  ...props
}: TableHeadProps & { ref?: React.Ref<HTMLTableCellElement> | undefined }) => (
  <th
    ref={ref}
    scope={scope}
    className={cn(
      "h-[var(--table-header-height)] px-[var(--table-cell-padding-x)] text-start align-middle font-[var(--table-heading-weight)] text-muted-foreground",
      "[&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-px",
      !alignment && "last:text-end",
      numeric && "text-end font-mono tabular-nums",
      alignment && ALIGNMENT_CLASS[alignment],
      className,
    )}
    {...props}
  />
);
TableHead.displayName = "TableHead";

/** Renders a body cell, right-aligning the last column unless alignment is explicit. */
const TableCell = ({
  className,
  numeric = false,
  alignment,
  ref,
  ...props
}: TableCellProps & { ref?: React.Ref<HTMLTableCellElement> | undefined }) => (
  <td
    ref={ref}
    className={cn(
      "px-[var(--table-cell-padding-x)] py-[var(--table-cell-padding-y)] align-middle",
      "[&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-px",
      !alignment && "last:text-end",
      numeric && "text-end font-mono tabular-nums",
      alignment && ALIGNMENT_CLASS[alignment],
      className,
    )}
    {...props}
  />
);
TableCell.displayName = "TableCell";

/** Describes the table in a native caption positioned beneath its rows. */
const TableCaption = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement> & {
  ref?: React.Ref<HTMLTableCaptionElement> | undefined;
}) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
);
TableCaption.displayName = "TableCaption";

/** Composable native table with scroll containment, card chrome, and semantic row and cell parts. */
const Table = TableRoot as TableComponent;
Table.Body = TableBody;
Table.Caption = TableCaption;
Table.Cell = TableCell;
Table.Col = TableCol;
Table.Colgroup = TableColgroup;
Table.Footer = TableFooter;
Table.Head = TableHead;
Table.Header = TableHeader;
Table.Row = TableRow;

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableCol,
  TableColgroup,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
