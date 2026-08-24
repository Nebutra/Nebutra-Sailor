import { cn } from "../utils/cn";
import { EDITORIAL_EYEBROW, editorialBlock, editorialFrame } from "./editorial-surface";

export type EditorialComparisonRow = {
  cells: string[];
  key?: string;
  label: string;
};

export type EditorialComparisonTableProps = {
  className?: string;
  columns: string[];
  /**
   * Header for the row-label column. Localize it — leaving this to a hardcoded
   * English default is how "Dimension" ended up in Chinese articles.
   */
  dimensionLabel?: string;
  label?: string;
  rows: EditorialComparisonRow[];
  title?: string | null;
};

/**
 * Matrix comparing options across dimensions.
 *
 * Below `md` the table restacks into one block per row and each cell carries
 * its own column label, so the reader never has to drag a table sideways on a
 * phone to find out which column a value belonged to.
 */
export function EditorialComparisonTable({
  className,
  columns,
  dimensionLabel = "Dimension",
  label,
  rows,
  title,
}: EditorialComparisonTableProps) {
  const visibleColumns = columns.filter(Boolean);
  const visibleRows = rows.filter((row) => row.label || row.cells.some(Boolean));
  if (visibleColumns.length < 2 || !visibleRows.length) return null;

  return (
    <section
      className={cn(editorialBlock({ spacing: "loose", width: "breakout" }), className)}
      aria-label={title ?? label ?? undefined}
    >
      {(label || title) && (
        <div className="mb-5">
          {label && <div className={EDITORIAL_EYEBROW}>{label}</div>}
          {title && (
            <h3 className="mt-2 text-lg font-semibold leading-6 text-foreground">{title}</h3>
          )}
        </div>
      )}
      <div className={cn(editorialFrame({ elevation: "resting" }), "overflow-hidden")}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="bg-muted">
              <th
                className="w-[22%] border-b border-border px-4 py-3 font-semibold text-foreground"
                scope="col"
              >
                {dimensionLabel}
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  className="border-b border-border px-4 py-3 font-semibold text-foreground"
                  scope="col"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={row.key ?? `${rowIndex}-${row.label}`}
                className="block border-b border-border last:border-b-0 md:table-row"
              >
                <th
                  className="block bg-muted px-4 pb-2 pt-3 text-left align-top font-semibold text-foreground md:table-cell md:bg-transparent md:py-3"
                  scope="row"
                >
                  {row.label}
                </th>
                {visibleColumns.map((column, cellIndex) => (
                  <td
                    key={`${row.key ?? rowIndex}-${column}`}
                    className="block px-4 py-2 align-top leading-6 text-muted-foreground last:pb-3 md:table-cell md:py-3 md:last:pb-3"
                  >
                    <span className={cn("mb-1 block md:hidden", EDITORIAL_EYEBROW)}>{column}</span>
                    {row.cells[cellIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
