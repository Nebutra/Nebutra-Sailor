import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HOME_ORBIT, homeOrbitSrc } from "@/lib/orbit";
import {
  getEnabledSku,
  idPhotoParentTile,
  listIdPhotoCreateTiles,
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
    expect(publicSku.sample).toBe("/skus/cn-2in-blue.jpg");
  });

  it("ships a sample still for every live spec", () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "../../public/skus");
    for (const sku of listPublicSkus()) {
      expect(toPublicSku(sku).sample).toBe(`/skus/${sku.id}.jpg`);
      expect(existsSync(join(dir, `${sku.id}.jpg`))).toBe(true);
    }
  });

  it("puts 领证照 parent and child tiles on sample stills, not the fashion orbit", () => {
    const parent = idPhotoParentTile();
    const tiles = listIdPhotoCreateTiles();
    const orbit = HOME_ORBIT.find((tile) => tile.label === "领证照");

    expect(parent.sample).toBe("/skus/cn-2in-white.jpg");
    expect(parent.href).toBe("/create/id-photo");
    expect(parent.title).toBe("领证照");
    expect(tiles.map((tile) => tile.id)).toEqual(listPublicSkus().map((sku) => sku.id));
    expect(tiles.every((tile) => tile.href.startsWith("/create/id-photo?sku="))).toBe(true);
    expect(orbit && homeOrbitSrc(orbit)).toBe("/skus/cn-2in-white.jpg");
  });

  it("keeps the create masonry on sample stills instead of the fashion orbit", () => {
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/create/page.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/orbitSrc\("01\.jpg"\)/);
    expect(page).toContain("idPhotoParentTile");
    expect(page).toContain("listIdPhotoCreateTiles");
    expect(page).toContain("sku.sample");
  });
});
