import { describe, expect, it } from "vitest";
import { createDataTableTranslator, DEFAULT_DATA_TABLE_LABELS } from "../labels";

describe("DataTable labels", () => {
  it("resolves the internal common.table.* keys to English defaults", () => {
    const t = createDataTableTranslator();
    expect(t("common.table.columns")).toBe(DEFAULT_DATA_TABLE_LABELS.columns);
    expect(t("common.table.summary", { visible: 3, total: 10 })).toBe("3 of 10 rows");
  });

  it("takes caller translations and keeps unknown placeholders intact", () => {
    const t = createDataTableTranslator({ columns: "列", filterPlaceholder: "筛选 {title}" });
    expect(t("common.table.columns")).toBe("列");
    expect(t("common.table.filterPlaceholder", { title: "状态" })).toBe("筛选 状态");
    expect(t("common.table.multiCellCopySuccess")).toContain("{{count}}");
  });
});
