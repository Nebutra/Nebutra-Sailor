import * as React from "react";
import { tableTokens } from "../tokens/components/table";
import { cn } from "../utils";

type TableCssVar =
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

export type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  /** Class applied to the scroll container around the native table. */
  wrapperClassName?: string;
  /** Style applied to the scroll container around the native table. */
  wrapperStyle?: React.CSSProperties;
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

export type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  /** Aligns numeric headings and applies tabular numbers. */
  numeric?: boolean;
};

export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  /** Aligns numeric values and applies tabular numbers. */
  numeric?: boolean;
};

type TableComponent = React.ForwardRefExoticComponent<
  TableProps & React.RefAttributes<HTMLTableElement>
> & {
  Body: typeof TableBody;
  Caption: typeof TableCaption;
  Cell: typeof TableCell;
  Col: typeof TableCol;
  Colgroup: typeof TableColgroup;
  Footer: typeof TableFooter;
  Head: typeof TableHead;
  Header: typeof TableHeader;
  Row: typeof TableRow;
};

function createTableVars(style?: React.CSSProperties) {
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
    "--table-body-spacer": `${tableTokens.spacer.bodyTop}px`,
    "--table-motion-duration": `${tableTokens.motion.duration}ms`,
    "--table-motion-easing": tableTokens.motion.easing,
    ...style,
  } satisfies React.CSSProperties & Record<TableCssVar, string | number>;
}

const TableRoot = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapperClassName, wrapperStyle, style, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full min-w-[var(--table-min-width)] overflow-auto rounded-[var(--table-radius)] border border-border bg-card p-[var(--table-padding)]",
        wrapperClassName,
      )}
      style={createTableVars(wrapperStyle)}
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
  ),
);
TableRoot.displayName = "Table";

const TableColgroup = React.forwardRef<
  HTMLTableColElement,
  React.HTMLAttributes<HTMLTableColElement>
>(({ className, ...props }, ref) => <colgroup ref={ref} className={className} {...props} />);
TableColgroup.displayName = "TableColgroup";

const TableCol = React.forwardRef<
  HTMLTableColElement,
  React.ColHTMLAttributes<HTMLTableColElement>
>(({ className, ...props }, ref) => <col ref={ref} className={className} {...props} />);
TableCol.displayName = "TableCol";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("border-b border-border", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  (
    {
      className,
      striped = false,
      bordered = false,
      interactive = false,
      virtualize = false,
      ...props
    },
    ref,
  ) => (
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
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t border-border", className)} {...props} />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "[&_td:first-child]:rounded-l-[var(--table-row-radius)] [&_td:last-child]:rounded-r-[var(--table-row-radius)] transition-colors duration-[var(--table-motion-duration)] ease-[var(--table-motion-easing)] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, numeric = false, scope = "col", ...props }, ref) => (
    <th
      ref={ref}
      scope={scope}
      className={cn(
        "h-[var(--table-header-height)] px-[var(--table-cell-padding-x)] text-left align-middle font-[var(--table-heading-weight)] text-muted-foreground",
        "last:text-right [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-px",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, numeric = false, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-[var(--table-cell-padding-x)] py-[var(--table-cell-padding-y)] align-middle",
        "last:text-right [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-px",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

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
