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
    expect(pieces.every((piece) => piece.href === `/create?view=garment&piece=${piece.id}`)).toBe(
      true,
    );
    expect(
      pieces.every((piece) => piece.sample.startsWith("https://cdn.nebutra.com/kuanlan/wardrobe/")),
    ).toBe(true);
    expect(pieces.every((piece) => piece.sample.endsWith(".jpg?v=incamera"))).toBe(true);
    expect(listPublicSkus().some((sku) => sku.kind === "garment")).toBe(true);
    expect(listPublicSkus().some((sku) => sku.kind === "id-photo")).toBe(true);
    expect(pieces.every((piece) => piece.origin === "platform")).toBe(true);
    expect(pieces.every((piece) => piece.brand === BRAND.skuMark)).toBe(true);
  });

  it("ships an in-camera still for every piece, not a CV cutout or a portrait", async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "../../public/wardrobe");
    const compose = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../lib/garment-stills.ts"),
      "utf8",
    );
    expect(compose).toMatch(/composeGarmentStill[\s\S]*jpeg/);
    expect(compose).toMatch(/composeGarmentStill[\s\S]*return sharp/);
    expect(compose).not.toMatch(/composeGarmentStill[\s\S]*matteConnectedBackground/);

    for (const piece of listWardrobePieces()) {
      const file = join(dir, `${piece.id}.jpg`);
      expect(existsSync(file)).toBe(true);
      const meta = await sharp(file).metadata();
      const { data, info } = await sharp(file).raw().toBuffer({
        resolveWithObject: true,
      });
      expect(meta.format).toBe("jpeg");
      const pixel = (x: number, y: number) => {
        const i = (y * info.width + x) * info.channels;
        return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
      };
      const luma = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      const corner = luma(pixel(8, 8));
      const body = luma(pixel(Math.floor(info.width * 0.35), Math.floor(info.height * 0.55)));
      expect(corner).toBeGreaterThan(70);
      expect(corner).toBeLessThan(180);
      expect(body).toBeLessThan(80);
      if (piece.id !== "oxford") {
        let collar = 0;
        for (let y = Math.floor(info.height * 0.12); y < Math.floor(info.height * 0.42); y += 1) {
          for (let x = Math.floor(info.width * 0.35); x < Math.floor(info.width * 0.65); x += 1) {
            const rgb = pixel(x, y);
            if (luma(rgb) > 200 && Math.abs(rgb[0] - rgb[1]) < 24) {
              collar += 1;
            }
          }
        }
        expect(collar).toBeGreaterThan(80);
      }
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
    expect(page).toContain('data-ground="smoke"');
    expect(page).not.toContain('data-ground="paper"');
    expect(page).toContain("piece.specIdentity");
    expect(page).not.toMatch(/VLM|识图|上传|衣架/);

    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"),
      "utf8",
    );
    expect(css).toContain(".masonry-item img.tile-photo-garment");
    expect(css).toContain("var(--garment-ground");
  });

  it("does not compose wardrobe stills with a CV matte", () => {
    const compose = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../scripts/compose-wardrobe-stills.ts"),
      "utf8",
    );
    const shoot = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../scripts/shoot-wardrobe-still.ts"),
      "utf8",
    );
    expect(compose).not.toContain("matteConnectedBackground");
    expect(shoot).not.toContain("matteConnectedBackground");
    expect(compose).toContain("composeGarmentStill");
  });
});
