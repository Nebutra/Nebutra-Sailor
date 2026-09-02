import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { momentLabel, sortMomentsNewestFirst } from "./moments";

describe("moment order", () => {
  it("puts the newest first", () => {
    const ordered = sortMomentsNewestFirst([
      { id: "b", shotAt: new Date("2026-08-01T00:00:00Z") },
      { id: "a", shotAt: new Date("2026-08-09T00:00:00Z") },
    ]);
    expect(ordered.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("sends prints with no time to the end rather than the top", () => {
    const ordered = sortMomentsNewestFirst([
      { id: "undated" },
      { id: "dated", shotAt: new Date("2026-01-01T00:00:00Z") },
    ]);
    expect(ordered.map((m) => m.id)).toEqual(["dated", "undated"]);
  });

  it("breaks ties on id so the grid does not wobble between renders", () => {
    const at = new Date("2026-08-01T00:00:00Z");
    const ordered = sortMomentsNewestFirst([
      { id: "b", shotAt: at },
      { id: "a", shotAt: at },
    ]);
    expect(ordered.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("does not mutate its input", () => {
    const input = [
      { id: "b", shotAt: new Date("2026-08-01T00:00:00Z") },
      { id: "a", shotAt: new Date("2026-08-09T00:00:00Z") },
    ];
    sortMomentsNewestFirst(input);
    expect(input.map((m) => m.id)).toEqual(["b", "a"]);
  });
});

describe("moment label", () => {
  it("names the shoot and the size", () => {
    expect(momentLabel({ skuId: "linkedin-smoke", sizeId: "linkedin" })).toBe(
      "领证照 · 灰蓝 · 西装 · 40 × 50",
    );
  });

  it("still names a shot whose SKU has since been closed", () => {
    // id-blue closes the 一寸 size. A Moment taken while it was open must not
    // lose its caption because the operator flipped the switch afterwards.
    expect(momentLabel({ skuId: "id-blue", sizeId: "1in" })).toBe("证件照 · 蓝底 · 一寸");
  });

  it("resolves a print alias to the SKU it belongs to", () => {
    expect(momentLabel({ skuId: "cn-2in-white" })).toBe("证件照 · 白底 · 二寸");
  });

  it("falls back rather than printing a raw id at a reader", () => {
    expect(momentLabel({ skuId: "gone-for-good" })).toBe("拍过的一张");
    expect(momentLabel({})).toBe("拍过的一张");
  });
});

describe("moments page", () => {
  it("fails closed when R2 denies the listing instead of throwing through SSR", () => {
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/moments/page.tsx"),
      "utf8",
    );
    expect(page).toContain("这一刻还存不进去。");
    expect(page).not.toContain("throw error");
  });
});
