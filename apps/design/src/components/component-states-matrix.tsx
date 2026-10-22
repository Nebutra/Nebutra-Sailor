"use client";

/**
 * Interaction state × size/density, for one component.
 *
 * The third axis, light and dark, is the page's own preview-theme bar: this
 * matrix lives inside it, so choosing Split renders the whole grid in both
 * themes side by side.
 *
 * Only states a prop can express are columns (default, disabled, loading,
 * invalid…). Hover, pressed and keyboard focus cannot be forced from outside
 * without faking them, so they are left live: every cell is a real component,
 * and hovering or tabbing to it is the test.
 */

import { cn } from "@nebutra/ui/utils";
import type * as React from "react";
import { ComponentSection } from "./component-section";

export interface MatrixAxis {
  id: string;
  label: string;
}

export function ComponentStatesMatrix({
  columns,
  rows,
  render,
  rowsLabel,
  note,
  cellClassName,
}: {
  /** Interaction states, left to right. */
  columns: readonly MatrixAxis[];
  /** Sizes or density steps, top to bottom. */
  rows: readonly MatrixAxis[];
  render: (row: string, column: string) => React.ReactNode;
  /** Header over the row labels: "Size", "Density". */
  rowsLabel: string;
  note?: React.ReactNode;
  cellClassName?: string;
}) {
  return (
    <ComponentSection
      note={
        <p>
          {note ?? (
            <>
              Every cell is the real component. Hover and press are live, and Tab reaches each cell,
              so keyboard focus is testable here too.
            </>
          )}{" "}
          Use <strong className="font-medium text-foreground">Split</strong> above to see both
          themes at once.
        </p>
      }
      title="States"
    >
      {/* Keep absolutely positioned assistive text inside the scroll container. */}
      <div className="relative min-w-0 max-w-full overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-border border-b bg-background">
              <th
                className="sticky left-0 z-[1] bg-background px-4 py-2 text-left font-medium text-muted-foreground text-xs"
                scope="col"
              >
                {rowsLabel}
              </th>
              {columns.map((column) => (
                <th
                  className="px-4 py-2 text-left font-medium text-muted-foreground text-xs"
                  key={column.id}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-border border-b last:border-b-0" key={row.id}>
                <th
                  className="sticky left-0 z-[1] bg-card px-4 py-4 text-left align-middle font-medium font-mono text-foreground text-xs"
                  scope="row"
                >
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td className={cn("px-4 py-4 align-middle", cellClassName)} key={column.id}>
                    <div className="flex min-w-max items-center">{render(row.id, column.id)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ComponentSection>
  );
}
