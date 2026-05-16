"use client";

import * as React from "react";
import { type GridBreakpoint, gridTokens } from "../tokens/components/grid";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export type GridResponsiveValue<T> = T | Partial<Record<GridBreakpoint, T>>;
export type GridLine = number | `${number}` | `${number}/${number}` | `${number}/-${number}`;
export type GridHeight = "preserve-aspect-ratio" | string | number;
export type GridHideGuides = "row" | "column" | "both";

type GridCssVar =
  | "--grid-columns"
  | "--grid-rows"
  | "--grid-guide-width"
  | "--grid-guide-color"
  | "--grid-cell-min-block-size"
  | "--grid-cell-padding"
  | "--grid-cell-solid-background"
  | "--grid-cell-debug-background"
  | "--grid-radius";

type GridStyle = React.CSSProperties & Record<GridCssVar, string | number>;

interface GridSystemContextValue {
  debug: boolean;
  guideWidth: string;
  useContainer: boolean;
}

export interface GridSystemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  /** Show debug cell wash and container-query boundary. */
  debug?: boolean;
  /** Guide stroke width. Defaults to the Grid component token. */
  guideWidth?: number | string;
  /**
   * Use container queries for nested responsive Grid props.
   * Kept unstable because it depends on the caller's containment strategy.
   */
  unstable_useContainer?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;

  /**
   * Compatibility path for the historical API where Grid.System was also
   * the grid root. New code should render <Grid.System><Grid /></Grid.System>.
   */
  columns?: GridResponsiveValue<number>;
  rows?: GridResponsiveValue<number>;
  rowHeight?: number | string;
  showGuides?: boolean;
  hideGuides?: GridHideGuides;
}

export interface GridProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  /** Number of equal-width columns. Can be responsive at sm/md/lg. */
  columns: GridResponsiveValue<number>;
  /** Number of rows. Can be responsive at sm/md/lg. */
  rows?: GridResponsiveValue<number>;
  /** Preserve the column/row ratio, or use a CSS height value. */
  height?: GridHeight;
  /** Hide one or both guide axes. */
  hideGuides?: GridHideGuides;
  /** Legacy auto-row height for old Grid.System compatibility. */
  rowHeight?: number | string;
  /** Override system debug for a single grid. */
  debug?: boolean;
  /** Override system guide width for a single grid. */
  guideWidth?: number | string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export interface GridCellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  /** Explicit CSS grid-column placement, e.g. 1, "1/3", "2/4". */
  column?: GridResponsiveValue<GridLine>;
  /** Explicit CSS grid-row placement, e.g. 1, "1/3", "1/-1". */
  row?: GridResponsiveValue<GridLine>;
  /** Compatibility alias for column span. Prefer column for new code. */
  span?: GridResponsiveValue<number>;
  /** Opaque cell background that clips guide lines behind the cell. */
  solid?: boolean;
  /** Compatibility alias that clips all guides behind this cell. */
  hideGuides?: boolean | GridHideGuides;
  /** Deprecated compatibility aliases from the pre-System/Grid split. */
  hideRowGuides?: boolean | "top" | "bottom";
  hideColumnGuides?: boolean | "left" | "right";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

type ResponsiveRuleTarget = "grid" | "cell";

const defaultGridSystemContext: GridSystemContextValue = {
  debug: false,
  guideWidth: `${gridTokens.guide.width}px`,
  useContainer: false,
};

const GridSystemContext = React.createContext<GridSystemContextValue>(defaultGridSystemContext);

const responsiveBreakpoints = [
  ["md", gridTokens.breakpoints.md],
  ["lg", gridTokens.breakpoints.lg],
] as const;

function isResponsiveRecord<T>(
  value: GridResponsiveValue<T> | undefined,
): value is Partial<Record<GridBreakpoint, T>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveResponsiveBase<T>(value: GridResponsiveValue<T> | undefined, fallback: T): T {
  if (!isResponsiveRecord(value)) return value ?? fallback;
  return value.sm ?? value.md ?? value.lg ?? fallback;
}

function resolveOptionalBase<T>(value: GridResponsiveValue<T> | undefined): T | undefined {
  if (!isResponsiveRecord(value)) return value;
  return value.sm ?? value.md ?? value.lg;
}

function resolveResponsiveAt<T>(
  value: GridResponsiveValue<T> | undefined,
  breakpoint: Exclude<GridBreakpoint, "sm">,
): T | undefined {
  return isResponsiveRecord(value) ? value[breakpoint] : undefined;
}

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

function toScopedClassName(id: string, target: ResponsiveRuleTarget) {
  return `nebutra-${target}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function trackTemplate(count: number) {
  return `repeat(${count}, minmax(0, 1fr))`;
}

function gridLineValue(value: GridLine) {
  return typeof value === "number" ? `${value}` : value;
}

function gridSpanValue(value: number) {
  return `span ${value} / span ${value}`;
}

function responsiveQuery(useContainer: boolean, width: number) {
  return useContainer ? `@container (min-width: ${width}px)` : `@media (min-width: ${width}px)`;
}

function guideBackgroundImage(hideGuides: GridHideGuides | undefined) {
  if (hideGuides === "both") return "none";

  const layers: string[] = [];

  if (hideGuides !== "row") {
    layers.push(
      "linear-gradient(to bottom, var(--grid-guide-color) 0 var(--grid-guide-width), transparent var(--grid-guide-width) 100%)",
    );
  }

  if (hideGuides !== "column") {
    layers.push(
      "linear-gradient(to right, var(--grid-guide-color) 0 var(--grid-guide-width), transparent var(--grid-guide-width) 100%)",
    );
  }

  return layers.length > 0 ? layers.join(", ") : "none";
}

function guideBackgroundSize(hideGuides: GridHideGuides | undefined) {
  if (hideGuides === "both") return undefined;

  const sizes: string[] = [];

  if (hideGuides !== "row") {
    sizes.push("100% calc(100% / var(--grid-rows))");
  }

  if (hideGuides !== "column") {
    sizes.push("calc(100% / var(--grid-columns)) 100%");
  }

  return sizes.length > 0 ? sizes.join(", ") : undefined;
}

function guideBorderClassName(hideGuides: GridHideGuides | undefined) {
  if (hideGuides === "both") return "border-0";
  if (hideGuides === "row") return "border-x border-[var(--grid-guide-color)]";
  if (hideGuides === "column") return "border-y border-[var(--grid-guide-color)]";
  return "border border-[var(--grid-guide-color)]";
}

function createGridResponsiveCss({
  className,
  columns,
  rows,
  height,
  useContainer,
  baseColumns,
  baseRows,
}: {
  className: string;
  columns: GridResponsiveValue<number>;
  rows: GridResponsiveValue<number> | undefined;
  height: GridHeight | undefined;
  useContainer: boolean;
  baseColumns: number;
  baseRows: number;
}) {
  const blocks: string[] = [];

  for (const [breakpoint, width] of responsiveBreakpoints) {
    const nextColumns = resolveResponsiveAt(columns, breakpoint);
    const nextRows = resolveResponsiveAt(rows, breakpoint);
    const columnsForRatio = nextColumns ?? baseColumns;
    const rowsForRatio = nextRows ?? baseRows;
    const declarations: string[] = [];

    if (nextColumns !== undefined) {
      declarations.push(`--grid-columns:${nextColumns};`);
      declarations.push(`grid-template-columns:${trackTemplate(nextColumns)};`);
    }

    if (nextRows !== undefined) {
      declarations.push(`--grid-rows:${nextRows};`);
      declarations.push(`grid-template-rows:${trackTemplate(nextRows)};`);
    }

    if (
      height === "preserve-aspect-ratio" &&
      (nextColumns !== undefined || nextRows !== undefined)
    ) {
      declarations.push(`aspect-ratio:${columnsForRatio}/${rowsForRatio};`);
    }

    if (declarations.length > 0) {
      blocks.push(
        `${responsiveQuery(useContainer, width)}{.${className}{${declarations.join("")}}}`,
      );
    }
  }

  return blocks.join("\n");
}

function resolveCellColumn(
  column: GridResponsiveValue<GridLine> | undefined,
  span: GridResponsiveValue<number> | undefined,
) {
  const columnValue = resolveOptionalBase(column);
  if (columnValue !== undefined) return gridLineValue(columnValue);

  const spanValue = resolveOptionalBase(span);
  return spanValue !== undefined ? gridSpanValue(spanValue) : undefined;
}

function resolveCellColumnAt(
  column: GridResponsiveValue<GridLine> | undefined,
  span: GridResponsiveValue<number> | undefined,
  breakpoint: Exclude<GridBreakpoint, "sm">,
) {
  const columnValue = resolveResponsiveAt(column, breakpoint);
  if (columnValue !== undefined) return gridLineValue(columnValue);

  const spanValue = resolveResponsiveAt(span, breakpoint);
  return spanValue !== undefined ? gridSpanValue(spanValue) : undefined;
}

function createCellResponsiveCss({
  className,
  column,
  row,
  span,
  useContainer,
}: {
  className: string;
  column: GridResponsiveValue<GridLine> | undefined;
  row: GridResponsiveValue<GridLine> | undefined;
  span: GridResponsiveValue<number> | undefined;
  useContainer: boolean;
}) {
  const blocks: string[] = [];

  for (const [breakpoint, width] of responsiveBreakpoints) {
    const gridColumn = resolveCellColumnAt(column, span, breakpoint);
    const rowValue = resolveResponsiveAt(row, breakpoint);
    const declarations: string[] = [];

    if (gridColumn !== undefined) declarations.push(`grid-column:${gridColumn};`);
    if (rowValue !== undefined) declarations.push(`grid-row:${gridLineValue(rowValue)};`);

    if (declarations.length > 0) {
      blocks.push(
        `${responsiveQuery(useContainer, width)}{.${className}{${declarations.join("")}}}`,
      );
    }
  }

  return blocks.join("\n");
}

function gridCssVars(columns: number, rows: number, guideWidth: string) {
  return {
    "--grid-columns": columns,
    "--grid-rows": rows,
    "--grid-guide-width": guideWidth,
    "--grid-guide-color": gridTokens.guide.color,
    "--grid-cell-min-block-size": `${gridTokens.cell.minBlockSize}px`,
    "--grid-cell-padding": `${gridTokens.cell.padding}px`,
    "--grid-cell-solid-background": gridTokens.cell.solidBackground,
    "--grid-cell-debug-background": gridTokens.cell.debugBackground,
    "--grid-radius": `${gridTokens.radius}px`,
  } satisfies GridStyle;
}

// =============================================================================
// Grid.System
// =============================================================================

const GridSystem = React.forwardRef<HTMLDivElement, GridSystemProps>(
  (
    {
      className,
      debug = false,
      guideWidth = gridTokens.guide.width,
      unstable_useContainer = false,
      children,
      style,
      columns,
      rows,
      rowHeight,
      showGuides = true,
      hideGuides,
      ...props
    },
    ref,
  ) => {
    const guideWidthValue = toCssLength(guideWidth);
    const contextValue = React.useMemo<GridSystemContextValue>(
      () => ({
        debug,
        guideWidth: guideWidthValue,
        useContainer: unstable_useContainer,
      }),
      [debug, guideWidthValue, unstable_useContainer],
    );

    const legacyGridProps = {
      ...(rows !== undefined ? { rows } : {}),
      ...(rowHeight !== undefined ? { rowHeight } : {}),
      ...(showGuides ? (hideGuides !== undefined ? { hideGuides } : {}) : { hideGuides: "both" }),
    } satisfies Omit<GridProps, "children" | "columns">;

    const content =
      columns !== undefined ? (
        <GridRoot columns={columns} {...legacyGridProps}>
          {children}
        </GridRoot>
      ) : (
        children
      );

    return (
      <GridSystemContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-grid-system=""
          data-debug={debug ? "" : undefined}
          className={cn("w-full min-w-0", className)}
          style={{
            containerType: unstable_useContainer ? "inline-size" : undefined,
            ...style,
          }}
          {...props}
        >
          {content}
        </div>
      </GridSystemContext.Provider>
    );
  },
);
GridSystem.displayName = "Grid.System";

// =============================================================================
// Grid
// =============================================================================

const GridRoot = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      columns,
      rows,
      height,
      hideGuides,
      rowHeight,
      debug,
      guideWidth,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const system = React.useContext(GridSystemContext);
    const id = React.useId();
    const scopedClassName = toScopedClassName(id, "grid");
    const baseColumns = resolveResponsiveBase(columns, 1);
    const baseRows = resolveResponsiveBase(rows, 1);
    const resolvedDebug = debug ?? system.debug;
    const resolvedGuideWidth =
      guideWidth !== undefined ? toCssLength(guideWidth) : system.guideWidth;
    const responsiveCss = createGridResponsiveCss({
      className: scopedClassName,
      columns,
      rows,
      height,
      useContainer: system.useContainer,
      baseColumns,
      baseRows,
    });

    return (
      <>
        {responsiveCss ? <style>{responsiveCss}</style> : null}
        <div
          ref={ref}
          data-grid=""
          data-debug={resolvedDebug ? "" : undefined}
          className={cn(
            scopedClassName,
            "relative isolate grid w-full min-w-0 overflow-hidden rounded-[var(--grid-radius)]",
            "min-h-[calc(var(--grid-rows)*var(--grid-cell-min-block-size))]",
            guideBorderClassName(hideGuides),
            className,
          )}
          style={{
            ...gridCssVars(baseColumns, baseRows, resolvedGuideWidth),
            gridTemplateColumns: trackTemplate(baseColumns),
            ...(rows !== undefined ? { gridTemplateRows: trackTemplate(baseRows) } : {}),
            ...(rowHeight !== undefined ? { gridAutoRows: toCssLength(rowHeight) } : {}),
            ...(height === "preserve-aspect-ratio"
              ? { aspectRatio: `${baseColumns} / ${baseRows}` }
              : height !== undefined
                ? { height: toCssLength(height) }
                : {}),
            backgroundImage: guideBackgroundImage(hideGuides),
            backgroundSize: guideBackgroundSize(hideGuides),
            backgroundRepeat: "repeat",
            ...style,
          }}
          {...props}
        >
          {children}
        </div>
      </>
    );
  },
);
GridRoot.displayName = "Grid";

// =============================================================================
// Grid.Cell
// =============================================================================

const GridCell = React.forwardRef<HTMLDivElement, GridCellProps>(
  (
    {
      className,
      column,
      row,
      span,
      solid = false,
      hideGuides,
      hideRowGuides,
      hideColumnGuides,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const system = React.useContext(GridSystemContext);
    const id = React.useId();
    const scopedClassName = toScopedClassName(id, "cell");
    const gridColumn = resolveCellColumn(column, span);
    const gridRow = resolveOptionalBase(row);
    const responsiveCss = createCellResponsiveCss({
      className: scopedClassName,
      column,
      row,
      span,
      useContainer: system.useContainer,
    });
    const clipsGuides =
      solid || hideGuides === true || hideRowGuides !== undefined || hideColumnGuides !== undefined;

    return (
      <>
        {responsiveCss ? <style>{responsiveCss}</style> : null}
        <div
          ref={ref}
          data-grid-cell=""
          data-solid={clipsGuides ? "" : undefined}
          className={cn(
            scopedClassName,
            "relative min-h-[var(--grid-cell-min-block-size)] min-w-0 overflow-hidden p-[var(--grid-cell-padding)]",
            "text-foreground focus-within:z-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            clipsGuides && "bg-[var(--grid-cell-solid-background)]",
            !clipsGuides && system.debug && "bg-[var(--grid-cell-debug-background)]",
            className,
          )}
          style={{
            ...(gridColumn !== undefined ? { gridColumn } : {}),
            ...(gridRow !== undefined ? { gridRow: gridLineValue(gridRow) } : {}),
            ...style,
          }}
          {...props}
        >
          {children}
        </div>
      </>
    );
  },
);
GridCell.displayName = "Grid.Cell";

// =============================================================================
// Compound export
// =============================================================================

export const Grid = Object.assign(GridRoot, {
  System: GridSystem,
  Cell: GridCell,
});

export { GridCell, GridRoot, GridSystem };
