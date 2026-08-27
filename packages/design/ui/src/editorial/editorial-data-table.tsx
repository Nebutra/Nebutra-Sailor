import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { EDITORIAL_CAPTION, editorialBlock, editorialFrame } from "./editorial-surface";

export type EditorialDataTableRow = {
  cells: ReactNode[];
  key: string;
};

export type EditorialDataTableProps = {
  caption?: ReactNode;
  className?: string;
  head: ReactNode[];
  rows: EditorialDataTableRow[];
};

/**
 * Table rendered from author-written markup, where cells carry links, code and
 * inline math rather than plain strings.
 *
 * Cells are `ReactNode`, so unlike `EditorialComparisonTable` this cannot
 * restack into labelled blocks on small screens — it scrolls instead, inside a
 * framed container that makes the clipped edge obvious.
 */
export function EditorialDataTable({ caption, className, head, rows }: EditorialDataTableProps) {
  if (!head.length || !rows.length) return null;

  return (
    <figure className={cn(editorialBlock({ spacing: "normal", width: "breakout" }), className)}>
      <div className={cn(editorialFrame({ elevation: "resting" }), "overflow-x-auto")}>
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-muted-foreground">
          <thead className="bg-muted">
            <tr>
              {head.map((cell, index) => (
                <th
                  // Header cells are rendered nodes with no stable identity of
                  // their own; column position is the identity.
                  key={`head-${index}`}
                  className="border-b border-border px-4 py-3 font-semibold text-foreground"
                  scope="col"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-b-0">
                {row.cells.map((cell, cellIndex) => (
                  <td key={`${row.key}-${cellIndex}`} className="px-4 py-3 align-top leading-6">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className={cn("mt-3", EDITORIAL_CAPTION)}>{caption}</figcaption>}
    </figure>
  );
}
