import { describe, expect, it } from "vitest";
import {
  getEnabledSku,
  listPublicSkus,
  SKUS,
  SkuUnavailableError,
  skuPixelSize,
  toPublicSku,
} from "./skus";

describe("id-photo catalog", () => {
  it("keeps at least one live 领证照 spec and one operator-closed spec", () => {
    const live = SKUS.filter((sku) => sku.enabled);
    const closed = SKUS.filter((sku) => !sku.enabled);

    expect(live.length).toBeGreaterThanOrEqual(1);
    expect(closed.length).toBeGreaterThanOrEqual(1);
    expect(live.every((sku) => sku.kind === "id-photo")).toBe(true);
  });

  it("hides disabled specs from the public list", () => {
    const publicIds = listPublicSkus().map((sku) => sku.id);

    expect(publicIds).not.toContain("cn-1in-blue");
    expect(publicIds).toContain("cn-1in-white");
    expect(publicIds).toContain("visa-us");
  });

  it("locks print pixels from millimetres and DPI", () => {
    expect(skuPixelSize({ widthMm: 25, heightMm: 35, dpi: 300 })).toEqual({
      width: 295,
      height: 413,
    });
    expect(skuPixelSize({ widthMm: 35, heightMm: 49, dpi: 300 })).toEqual({
      width: 413,
      height: 579,
    });
    expect(skuPixelSize({ widthMm: 33, heightMm: 48, dpi: 300 })).toEqual({
      width: 390,
      height: 567,
    });
    expect(skuPixelSize({ widthMm: 51, heightMm: 51, dpi: 300 })).toEqual({
      width: 602,
      height: 602,
    });
  });

  it("fails closed on unknown or disabled SKUs", () => {
    expect(() => getEnabledSku("cn-1in-blue")).toThrow(SkuUnavailableError);
    expect(() => getEnabledSku("not-a-sku")).toThrow(SkuUnavailableError);
    expect(getEnabledSku("passport-cn").title).toBe("护照");
  });

  it("does not leak operator fields on the public projection", () => {
    const sku = getEnabledSku("cn-2in-blue");
    const publicSku = toPublicSku(sku);

    expect(publicSku).not.toHaveProperty("enabled");
    expect(publicSku).not.toHaveProperty("headRatio");
    expect(publicSku).not.toHaveProperty("prompt");
    expect(JSON.stringify(publicSku)).not.toMatch(/Official identification|same person/);
    expect(publicSku.widthPx).toBe(413);
    expect(publicSku.heightPx).toBe(579);
    expect(publicSku.background).toBe("blue");
  });
});
