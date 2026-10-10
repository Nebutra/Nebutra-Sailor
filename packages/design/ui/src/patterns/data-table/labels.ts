import { type DataTableLabels, DEFAULT_UI_LABELS } from "../../primitives/ui-labels";

/**
 * Every string DataTable renders, with English defaults
 * (DEFAULT_UI_LABELS.dataTable — the shared @nebutra/ui labels contract).
 *
 * DataTable used to call next-intl's useTranslations() for `common.table.*`
 * keys that no message catalog in the repo defined — any app that mounted it
 * would have shown raw keys, and one without a next-intl provider would have
 * thrown. A shared component cannot own a product's catalog; like the rest of
 * the library it takes `labels` (translated by the caller) and falls back to
 * English. The internal `t(key, values)` call sites are unchanged.
 */
export type { DataTableLabels };

export const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = DEFAULT_UI_LABELS.dataTable;

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
