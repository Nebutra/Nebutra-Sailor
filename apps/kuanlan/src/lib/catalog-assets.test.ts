import { describe, expect, it } from "vitest";
import {
  CATALOG_ASSET_BUCKET,
  catalogPublicFile,
  catalogSeedObject,
  listCatalogSeedObjects,
} from "./catalog-assets";
import { DEFAULT_R2_PUBLIC_URL, skuSampleSrc, wardrobeSampleSrc } from "./resources";

describe("catalog assets", () => {
  it("maps seed files onto the assets-bucket keys the browser consumes", () => {
    const objects = listCatalogSeedObjects({
      orbit: ["01.jpg"],
      skus: ["linkedin-smoke.jpg"],
      wardrobe: ["blazer.png"],
    });

    expect(CATALOG_ASSET_BUCKET).toBe("nebutra-assets");
    expect(objects.map((object) => object.key)).toEqual([
      "kuanlan/orbit/01.jpg",
      "kuanlan/skus/linkedin-smoke.jpg",
      "kuanlan/wardrobe/blazer.png",
    ]);
    expect(catalogPublicFile(objects[2]!)).toBe("public/wardrobe/blazer.png");
    expect(objects[2]?.contentType).toBe("image/png");
  });

  it("refuses names that would escape the catalog prefixes", () => {
    expect(() => catalogSeedObject("wardrobe", "../face.png")).toThrow(/invalid_catalog_name/);
    expect(() => catalogSeedObject("skus", "linkedin-smoke.png")).toThrow(/invalid_catalog_name/);
  });

  it("serves wardrobe and SKU samples from the public R2 host", () => {
    expect(wardrobeSampleSrc("knit")).toBe(`${DEFAULT_R2_PUBLIC_URL}/kuanlan/wardrobe/knit.png`);
    expect(skuSampleSrc("visa-us")).toBe(`${DEFAULT_R2_PUBLIC_URL}/kuanlan/skus/visa-us.jpg`);
  });
});
