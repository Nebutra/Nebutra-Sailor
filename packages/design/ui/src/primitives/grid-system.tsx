"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface GridSystemProps {
  /** Number of equal-width columns. Default: 12 */
  columns?: number;
  /** Minimum row height (CSS value). Applied as `minHeight` on rows. */
  rowHeight?: string | number;
  /** Show 1px guide lines between columns and rows. Default: true */
  showGuides?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface GridCellProps {
  /**
   * Number of columns this cell spans.
   * Also accepts an object for responsive spans: `{ sm: 12, md: 6, lg: 4 }`
   */
  span?: number;
  /** Whether to render the cell with a solid background (covers guide lines behind it) */
  solid?: boolean;
  /**
   * Hide horizontal (row) guide lines around this cell.
   * - `true` — hide both top and bottom
   * - `"top"` — hide top only
   * - `"bottom"` — hide bottom only
   */
  hideRowGuides?: boolean | "top" | "bottom";
  /**
   * Hide vertical (column) guide lines around this cell.
   * - `true` — hide both left and right
   * - `"left"` — hide left only
   * - `"right"` — hide right only
   */
  hideColumnGuides?: boolean | "left" | "right";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// =============================================================================
// GridSystem
// =============================================================================
//
// Implementation strategy:
//   Grid.System  = CSS grid container with `border-color` as background.
//   Grid.Cell    = grid item with `bg-background` fill — "showing through" the
//                  container background creates the 1px guide lines.
//   `solid` cell = uses `bg-muted` so its fill visually differs from the page.
//   guide hiding = individual border overrides on the cell.
//
// This avoids any SVG overlay or position:absolute hacks.
// =============================================================================

function GridSystem({
  columns = 12,
  rowHeight,
  showGuides = true,
  children,
  className,
  style,
}: GridSystemProps) {
  return (
    <div
      className={cn("grid w-full", showGuides && "gap-px bg-border", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        ...(rowHeight != null ? { gridAutoRows: rowHeight } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
GridSystem.displayName = "Grid.System";

// =============================================================================
// GridCell
// =============================================================================

function GridCell({
  span,
  solid = false,
  hideRowGuides,
  hideColumnGuides,
  children,
  className,
  style,
}: GridCellProps) {
  // Build border-override classes based on hideRowGuides / hideColumnGuides
  const borderOverrides: string[] = [];

  if (hideRowGuides === true || hideRowGuides === "top") {
    borderOverrides.push("border-t border-t-transparent");
  }
  if (hideRowGuides === true || hideRowGuides === "bottom") {
    borderOverrides.push("border-b border-b-transparent");
  }
  if (hideColumnGuides === true || hideColumnGuides === "left") {
    borderOverrides.push("border-l border-l-transparent");
  }
  if (hideColumnGuides === true || hideColumnGuides === "right") {
    borderOverrides.push("border-r border-r-transparent");
  }

  return (
    <div
      className={cn(
        // Fill the background so the 1px container bg shows as guides
        solid ? "bg-muted" : "bg-background",
        borderOverrides,
        "min-h-0 min-w-0",
        className,
      )}
      style={{
        ...(span != null ? { gridColumn: `span ${span} / span ${span}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
GridCell.displayName = "Grid.Cell";

// =============================================================================
// Compound export
// =============================================================================

export const Grid = {
  System: GridSystem,
  Cell: GridCell,
} as const;
