import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import { HOME_ORBIT, homeOrbitSrc } from "@/lib/orbit";
import {
  getEnabledGarment,
  getEnabledSku,
  idPhotoParentTile,
  listGarmentSkus,
  listIdPhotoCreateTiles,
  listIdPhotoSkus,
  listPublicSkus,
  parseIdPhotoRef,
  resolveIdPhotoPrint,
  SKUS,
  SkuUnavailableError,
  sealSkuBrand,
  skuPixelSize,
  toPublicGarment,
  toPublicIdPhoto,
} from "./skus";

describe("catalog", () => {
  it("keeps garments and shoot specs in one SKU list", () => {
    const live = SKUS.filter((sku) => sku.enabled);
    const closedSizes = SKUS.flatMap((sku) =>
      sku.kind === "id-photo" ? (sku.closedSizes ?? []) : [],
    );

    expect(live.some((sku) => sku.kind === "garment")).toBe(true);
    expect(live.some((sku) => sku.kind === "id-photo")).toBe(true);
    expect(closedSizes.length).toBeGreaterThanOrEqual(1);
    expect(listGarmentSkus().map((sku) => sku.id)).toEqual(["blazer", "knit", "oxford"]);
    expect(getEnabledGarment("blazer").kind).toBe("garment");
    expect(() => getEnabledSku("blazer")).toThrow(SkuUnavailableError);
    expect(() => getEnabledGarment("linkedin-smoke")).toThrow(SkuUnavailableError);
  });

  it("locks platform SKUs to the KUANLAN mark and leaves user SKUs free", () => {
    const live = listPublicSkus();
    expect(live.every((sku) => sku.origin === "platform")).toBe(true);
    expect(live.every((sku) => sku.brand === BRAND.skuMark)).toBe(true);
    expect(toPublicGarment(getEnabledGarment("blazer")).brand).toBe(BRAND.skuMark);
    expect(toPublicIdPhoto(getEnabledSku("linkedin-smoke")).brand).toBe(BRAND.skuMark);
    expect(toPublicIdPhoto(getEnabledSku("id-white")).origin).toBe("platform");

    const spoofed = sealSkuBrand({
      origin: "platform" as const,
      brand: "Other House",
    });
    expect(spoofed.brand).toBe(BRAND.skuMark);

    const uploaded = sealSkuBrand({
      origin: "user" as const,
      brand: "Studio Twelve",
    });
    expect(uploaded.brand).toBe("Studio Twelve");
    expect(sealSkuBrand({ origin: "user" as const, brand: "  " }).brand).toBe("");
  });

  it("gives garment SKUs a cut spec and leaves pants measures off tops", () => {
    const garments = listGarmentSkus();
    expect(garments.every((sku) => sku.spec.size && sku.spec.color && sku.spec.material)).toBe(
      true,
    );
    expect(garments.every((sku) => sku.spec.measures.inseam == null)).toBe(true);
    expect(garments.every((sku) => sku.spec.measures.length && sku.spec.measures.chest)).toBe(true);
    const pub = toPublicGarment(getEnabledGarment("blazer"));
    expect(pub.specIdentity).toBe("M · 藏青 · 羊毛");
    expect(pub.specMeasures).toContain("衣长 74");
    expect(pub.specMeasures).toContain("袖长 62");
    expect(pub.specMeasures).not.toContain("裤长");
    expect(JSON.stringify(pub)).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("lets a shoot spec point at a garment without owning it", () => {
    expect(getEnabledSku("linkedin-smoke").garmentId).toBe("blazer");
    expect(getEnabledSku("linkedin-smoke-knit").garmentId).toBe("knit");
    expect(getEnabledSku("linkedin-studio").garmentId).toBe("blazer");
    expect(getEnabledSku("linkedin-studio").background).toBe("studio");
    expect(getEnabledSku("id-white").garmentId).toBeUndefined();
    expect(getEnabledSku("linkedin-smoke").sizes).toEqual([
      "linkedin",
      "1in",
      "2in",
      "passport",
      "visa",
    ]);
    expect(getEnabledSku("id-white").sizes).toEqual(["1in", "2in", "passport", "visa"]);
    expect(getEnabledSku("id-blue").sizes).toEqual(["2in"]);
    expect(getEnabledSku("id-blue").closedSizes).toEqual(["1in"]);
  });

  it("hides disabled specs from the public list", () => {
    const publicIds = listPublicSkus().map((sku) => sku.id);

    expect(publicIds).not.toContain("cn-1in-blue");
    expect(publicIds).not.toContain("cn-1in-white");
    expect(publicIds).not.toContain("cn-2in-white");
    expect(publicIds).not.toContain("passport-cn");
    expect(publicIds).not.toContain("visa-us");
    expect(publicIds).toContain("blazer");
    expect(publicIds).toContain("linkedin-smoke");
    expect(publicIds).toContain("linkedin-smoke-knit");
    expect(publicIds).toContain("linkedin-smoke-oxford");
    expect(publicIds).toContain("linkedin-light");
    expect(publicIds).toContain("linkedin-studio");
    expect(publicIds).toContain("id-white");
    expect(publicIds).toContain("id-blue");
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
    expect(skuPixelSize({ widthMm: 40, heightMm: 50, dpi: 300 })).toEqual({
      width: 472,
      height: 591,
    });
  });

  it("fails closed on unknown or disabled SKUs", () => {
    expect(() => getEnabledSku("cn-1in-blue")).toThrow(SkuUnavailableError);
    expect(() => getEnabledSku("not-a-sku")).toThrow(SkuUnavailableError);
    expect(() => resolveIdPhotoPrint("id-blue", "1in")).toThrow(SkuUnavailableError);
    expect(getEnabledSku("cn-1in-white").id).toBe("id-white");
    expect(resolveIdPhotoPrint("passport-cn").sizeLabel).toBe("护照");
    expect(parseIdPhotoRef("cn-2in-blue")).toEqual({ skuId: "id-blue", sizeId: "2in" });
  });

  it("does not leak operator fields on the public projection", () => {
    const sku = getEnabledSku("id-blue");
    const publicSku = toPublicIdPhoto(sku);

    expect(publicSku).not.toHaveProperty("enabled");
    expect(publicSku).not.toHaveProperty("headRatio");
    expect(publicSku).not.toHaveProperty("prompt");
    expect(JSON.stringify(publicSku)).not.toMatch(
      /Official identification|same person|merino|crewneck|open-collar/,
    );
    expect(publicSku.widthPx).toBe(413);
    expect(publicSku.heightPx).toBe(579);
    expect(publicSku.look).toBe("id-card");
    expect(publicSku.background).toBe("blue");
    expect(publicSku.sample).toBe("https://cdn.nebutra.com/kuanlan/skus/cn-2in-blue.jpg");
    expect(publicSku.sizes.map((size) => size.id)).toEqual(["2in"]);
    expect(publicSku.sizeLabel).toBe("二寸");
    expect(publicSku.origin).toBe("platform");
    expect(publicSku.brand).toBe(BRAND.skuMark);
    expect(JSON.stringify(publicSku)).not.toMatch(/VLM|识图/);
  });

  it("ships a sample still for every live spec", () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "../../public/skus");
    for (const sku of listIdPhotoSkus()) {
      const fileId =
        sku.id === "id-white" ? "cn-1in-white" : sku.id === "id-blue" ? "cn-2in-blue" : sku.id;
      const bust = fileId === "linkedin-studio" ? "?v=incamera" : "";
      expect(toPublicIdPhoto(sku).sample).toBe(
        `https://cdn.nebutra.com/kuanlan/skus/${fileId}.jpg${bust}`,
      );
      expect(existsSync(join(dir, `${fileId}.jpg`))).toBe(true);
    }
  });

  it("puts 领证照 parent and child tiles on sample stills, not the fashion orbit", () => {
    const parent = idPhotoParentTile();
    const tiles = listIdPhotoCreateTiles();
    const orbit = HOME_ORBIT.find((tile) => tile.label === "领证照");

    expect(parent.sample).toBe("https://cdn.nebutra.com/kuanlan/skus/linkedin-smoke.jpg");
    expect(parent.href).toBe("/create/id-photo");
    expect(parent.title).toBe("领证照");
    expect(tiles.map((tile) => tile.id)).toEqual(listIdPhotoSkus().map((sku) => sku.id));
    expect(tiles[0]?.id).toBe("linkedin-smoke");
    expect(tiles.some((tile) => tile.id === "id-white")).toBe(true);
    expect(tiles.some((tile) => tile.id === "id-blue")).toBe(true);
    expect(tiles.some((tile) => tile.id === "cn-1in-white")).toBe(false);
    expect(tiles.every((tile) => tile.href.startsWith("/create/id-photo?sku="))).toBe(true);
    expect(tiles.every((tile) => tile.href.includes("&size="))).toBe(true);
    expect(tiles.every((tile) => tile.sizes.length >= 1)).toBe(true);

    const children = listIdPhotoCreateTiles({ excludeParent: true });
    expect(children.some((tile) => tile.id === parent.id)).toBe(false);
    expect(children.map((tile) => tile.sample)).not.toContain(parent.sample);
    expect(orbit && homeOrbitSrc(orbit)).toBe(
      "https://cdn.nebutra.com/kuanlan/skus/linkedin-smoke.jpg",
    );
  });

  it("keeps the create masonry on sample stills instead of the fashion orbit", () => {
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/create/page.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/orbitSrc\("01\.jpg"\)/);
    expect(page).toContain("idPhotoParentTile");
    expect(page).toContain("listIdPhotoCreateTiles");
    expect(page).toContain("excludeParent");
    expect(page).toContain("sku.sizes");
    expect(page).not.toContain("sku.widthMm");
    expect(page).toContain("sku.sample");
    expect(page).toContain("piece?");
    expect(page).toContain("pieceId");
    expect(page).toContain('label: "衣服"');
    expect(page).toContain("createFilterHref");
    expect(page).toContain("resolveCreateQuery");
    expect(page).toContain("view:");
    expect(page).toContain("viewParam");
    expect(page).not.toContain('href: "/wardrobe"');
    expect(page).not.toContain("质感|美式");
    expect(page).not.toContain("远方");
    expect(page).not.toMatch(/感觉(?!还在后面)/);
  });
});
