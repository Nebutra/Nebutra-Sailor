/**
 * Every string DataTable renders, with English defaults.
 *
 * DataTable used to call next-intl's useTranslations() for `common.table.*`
 * keys that no message catalog in the repo defined — any app that mounted it
 * would have shown raw keys, and one without a next-intl provider would have
 * thrown. A shared component cannot own a product's catalog; like the rest of
 * the library it takes `labels` (translated by the caller) and falls back to
 * English. The internal `t(key, values)` call sites are unchanged.
 */
export interface DataTableLabels {
  allFields: string;
  cellCopyError: string;
  cellCopySuccess: string;
  clearFilters: string;
  clearSelection: string;
  columns: string;
  /** `{count}` = visible column count. */
  columnSummary: string;
  copyCellTooltip: string;
  copyError: string;
  copySuccess: string;
  copyUnavailable: string;
  copyView: string;
  coreFields: string;
  /** `{title}` = the filter's column title. */
  filterPlaceholder: string;
  /** `{{count}}` = copied cell count. */
  multiCellCopySuccess: string;
  noMatches: string;
  pinLeft: string;
  pinRight: string;
  resizeColumn: string;
  presets: string;
  selectAll: string;
  /** `{visible}` / `{total}` = row counts. */
  summary: string;
  tip: string;
}

export const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = {
  allFields: "All fields",
  cellCopyError: "Couldn't copy the cell",
  cellCopySuccess: "Cell copied",
  clearFilters: "Clear filters",
  clearSelection: "Clear selection",
  columns: "Columns",
  columnSummary: "{count} columns",
  copyCellTooltip: "Click to copy",
  copyError: "Couldn't copy",
  copySuccess: "Copied",
  copyUnavailable: "Clipboard unavailable",
  copyView: "Copy view",
  coreFields: "Core fields",
  filterPlaceholder: "Filter {title}…",
  multiCellCopySuccess: "Copied {{count}} cells",
  noMatches: "No matches",
  pinLeft: "Pin left",
  pinRight: "Pin right",
  resizeColumn: "Resize column",
  presets: "Presets",
  selectAll: "Select all",
  summary: "{visible} of {total} rows",
  tip: "Drag across cells to select, then copy",
};

export type DataTableTranslate = (key: string, values?: Record<string, string | number>) => string;

/** `t("common.table.columns")` → labels.columns, with `{name}` substitution. */
export function createDataTableTranslator(labels?: Partial<DataTableLabels>): DataTableTranslate {
  const merged = { ...DEFAULT_DATA_TABLE_LABELS, ...labels };
  return (key, values) => {
    const name = key.replace(/^common\.table\./, "") as keyof DataTableLabels;
    const template = merged[name] ?? key;
    return values
      ? template.replace(/\{(\w+)\}/g, (match, k: string) =>
          k in values ? String(values[k]) : match,
        )
      : template;
  };
}
