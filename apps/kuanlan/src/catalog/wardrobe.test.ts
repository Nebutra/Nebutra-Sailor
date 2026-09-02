import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import { listGarmentSkus, listPublicSkus } from "./skus";
import { listWardrobePieces } from "./wardrobe";

describe("wardrobe", () => {
  it("hangs live garment SKUs, not shoot specs", () => {
    const pieces = listWardrobePieces();
    const garments = listGarmentSkus();

    expect(pieces.map((piece) => piece.id)).toEqual(garments.map((sku) => sku.id));
    expect(pieces.map((piece) => piece.id)).toEqual(["blazer", "knit", "oxford"]);
    expect(pieces.every((piece) => piece.kind === "garment")).toBe(true);
    expect(pieces.every((piece) => piece.skuId === piece.id)).toBe(true);
    expect(pieces.every((piece) => piece.href === `/create?piece=${piece.id}`)).toBe(true);
    expect(
      pieces.every((piece) => piece.sample.startsWith("https://cdn.nebutra.com/kuanlan/wardrobe/")),
    ).toBe(true);
    expect(pieces.every((piece) => piece.sample.endsWith(".png"))).toBe(true);
    expect(listPublicSkus().some((sku) => sku.kind === "garment")).toBe(true);
    expect(listPublicSkus().some((sku) => sku.kind === "id-photo")).toBe(true);
    expect(pieces.every((piece) => piece.origin === "platform")).toBe(true);
    expect(pieces.every((piece) => piece.brand === BRAND.skuMark)).toBe(true);
  });

  it("ships an alpha PNG still for every piece, not a portrait", async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "../../public/wardrobe");
    for (const piece of listWardrobePieces()) {
      const file = join(dir, `${piece.id}.png`);
      expect(existsSync(file)).toBe(true);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      expect(info.channels).toBe(4);
      let edge = 0;
      let mid = 0;
      let n = 0;
      const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3] ?? 0;
      for (let y = 0; y < 12; y += 1) {
        for (let x = 0; x < 12; x += 1) {
          edge += alpha(x, y) + alpha(info.width - 1 - x, y);
          n += 2;
        }
      }
      for (let y = Math.floor(info.height / 2) - 6; y < Math.floor(info.height / 2) + 6; y += 1) {
        for (let x = Math.floor(info.width / 2) - 6; x < Math.floor(info.width / 2) + 6; x += 1) {
          mid += alpha(x, y);
        }
      }
      expect(edge / n).toBeLessThan(8);
      expect(mid / 144).toBeGreaterThan(200);
    }
  });

  it("does not make the wardrobe about one shoot path", () => {
    const pieces = listWardrobePieces();
    const text = JSON.stringify(pieces);
    expect(text).not.toMatch(
      /领证|证件照|Official identification|same person|Prompt|生成|模型|VLM/,
    );
    expect(text).toContain("外套。可以罩在衬衫或针织外面。");
    expect(text).toContain(BRAND.skuMark);
    expect(text).toContain("衣长");
    expect(text).toContain("胸围");
    expect(text).toContain("袖长");
    expect(text).not.toContain("裤长");
    expect(pieces.every((piece) => piece.spec.size === "M")).toBe(true);
  });

  it("marks platform pieces with the KUANLAN brand and a swappable ground", () => {
    const page = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/wardrobe/page.tsx"),
      "utf8",
    );
    expect(page).toContain("tile-brand");
    expect(page).toContain("piece.brand");
    expect(page).toContain("tile-photo-garment");
    expect(page).toContain('data-ground="paper"');
    expect(page).toContain("piece.specIdentity");
    expect(page).not.toMatch(/VLM|识图|上传|衣架/);
  });
});
