import { describe, expect, it } from "vitest";
import {
  createFilterHref,
  defaultShootRef,
  isCreateView,
  momentShootHref,
  openShoot,
  parseCreateView,
  parseShootSearch,
  reduceShoot,
  resolveCreateQuery,
  shootForGarment,
  shootHref,
  shootNote,
} from "./shoot";

describe("shoot address", () => {
  it("writes sku and size onto the studio URL", () => {
    expect(shootHref({ skuId: "id-white", sizeId: "passport" })).toBe(
      "/create/id-photo?sku=id-white&size=passport",
    );
    expect(shootHref({ skuId: "id-white", sizeId: "passport" }, { q: "西装" })).toBe(
      "/create/id-photo?sku=id-white&size=passport&q=%E8%A5%BF%E8%A3%85",
    );
  });

  it("reads aliases and falls back to a live print", () => {
    expect(parseShootSearch({ sku: "cn-2in-blue" })).toEqual({ skuId: "id-blue", sizeId: "2in" });
    expect(parseShootSearch({ sku: "linkedin-smoke", size: "visa" })).toEqual({
      skuId: "linkedin-smoke",
      sizeId: "visa",
    });
    expect(parseShootSearch({ sku: "id-blue", size: "1in" })).toEqual({
      skuId: "id-blue",
      sizeId: "2in",
    });
    expect(parseShootSearch({})).toEqual(defaultShootRef());
  });

  it("points a garment at the first live print that wears it", () => {
    expect(shootForGarment("blazer")).toEqual({ skuId: "linkedin-smoke", sizeId: "linkedin" });
    expect(shootForGarment("knit")).toEqual({ skuId: "linkedin-smoke-knit", sizeId: "linkedin" });
    expect(shootForGarment("missing")).toBeNull();
  });

  it("opens a past Moment back on the same print", () => {
    expect(momentShootHref({ skuId: "id-white", sizeId: "2in" })).toBe(
      "/create/id-photo?sku=id-white&size=2in",
    );
    expect(momentShootHref({})).toBe(shootHref(defaultShootRef()));
  });
});

describe("create query", () => {
  it("keeps 衣服 / 领证照 / 全部 on /create", () => {
    expect(createFilterHref({ view: "all" })).toBe("/create");
    expect(createFilterHref({ view: "all", q: "西装" })).toBe(
      "/create?view=all&q=%E8%A5%BF%E8%A3%85",
    );
    expect(createFilterHref({ view: "garment", q: "西装" })).toBe(
      "/create?view=garment&q=%E8%A5%BF%E8%A3%85",
    );
    expect(createFilterHref({ view: "id-photo", piece: "blazer" })).toBe(
      "/create?view=id-photo&piece=blazer",
    );
    expect(parseCreateView("garment")).toBe("garment");
    expect(parseCreateView("nope")).toBe("all");
    expect(isCreateView("all")).toBe(true);
    expect(isCreateView("nope")).toBe(false);
  });

  it("maps search through the catalog, not a mood regex", () => {
    expect(resolveCreateQuery("西装")).toEqual({ view: "garment", piece: "blazer", q: "西装" });
    expect(resolveCreateQuery("护照")).toEqual({ view: "id-photo", sizeId: "passport", q: "护照" });
    expect(resolveCreateQuery("灰蓝 · 针织")).toEqual({ view: "id-photo", q: "灰蓝 · 针织" });
    expect(resolveCreateQuery("领英")).toEqual({ view: "id-photo", q: "领英" });
    expect(resolveCreateQuery("海边")).toEqual({ q: "海边" });
    expect(resolveCreateQuery("")).toEqual({});
  });
});

describe("shoot phases", () => {
  it("keeps spec, source, and result on one object", () => {
    let shoot = openShoot({ skuId: "linkedin-smoke", sizeId: "linkedin" });
    expect(shoot.phase).toBe("empty");

    shoot = reduceShoot(shoot, { type: "source", preview: "blob:face" });
    expect(shoot.phase).toBe("ready");
    expect(shoot.sourceUrl).toBe("blob:face");

    shoot = reduceShoot(shoot, { type: "spec", skuId: "id-white", sizeId: "1in" });
    expect(shoot).toMatchObject({
      skuId: "id-white",
      sizeId: "1in",
      sourceUrl: "blob:face",
      phase: "ready",
    });
    expect(shoot.resultUrl).toBeUndefined();

    shoot = reduceShoot(shoot, { type: "shoot" });
    expect(shoot.phase).toBe("shooting");

    shoot = reduceShoot(shoot, { type: "kept", url: "https://signed/print.png", id: "shot-1" });
    expect(shoot.phase).toBe("kept");
    expect(shoot.resultUrl).toBe("https://signed/print.png");
    expect(shoot.note).toBe("这一组，拍好了。");

    shoot = reduceShoot(shoot, { type: "again" });
    expect(shoot.phase).toBe("ready");
    expect(shoot.resultUrl).toBeUndefined();
    expect(shoot.sourceUrl).toBe("blob:face");
  });

  it("maps store and auth failures to phases, not loose notes", () => {
    const ready = reduceShoot(openShoot(defaultShootRef()), {
      type: "source",
      preview: "blob:face",
    });
    expect(reduceShoot(ready, { type: "http", status: 401 }).phase).toBe("needs-sign-in");
    expect(reduceShoot(ready, { type: "http", status: 503 }).phase).toBe("store-down");
    expect(reduceShoot(ready, { type: "http", status: 404 }).phase).toBe("sku-closed");
    expect(reduceShoot(ready, { type: "http", status: 400 }).phase).toBe("unreadable");
    expect(shootNote("needs-sign-in")).toBe("先让观澜认识你。");
    expect(shootNote("failed", true)).toBe("先选一张本人照片。");
  });
});
