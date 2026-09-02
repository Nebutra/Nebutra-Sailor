import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { GARMENT_STILL } from "@/catalog/skus";
import { composeGarmentStill, garmentStillSourceFile } from "./garment-stills";

describe("garment still compose", () => {
  it("covers the source into a JPEG and never punches alpha", async () => {
    const source = await sharp({
      create: {
        width: 200,
        height: 300,
        channels: 3,
        background: { r: 126, g: 134, b: 145 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 40,
              height: 20,
              channels: 3,
              background: { r: 250, g: 250, b: 250 },
            },
          })
            .png()
            .toBuffer(),
          left: 80,
          top: 40,
        },
      ])
      .jpeg()
      .toBuffer();

    const jpeg = await composeGarmentStill(source);
    const meta = await sharp(jpeg).metadata();
    const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    };

    expect(garmentStillSourceFile("blazer")).toBe("wardrobe-blazer.jpg");
    expect(meta.format).toBe("jpeg");
    expect(info.width).toBe(GARMENT_STILL.width);
    expect(info.height).toBe(GARMENT_STILL.height);
    expect(info.channels).toBe(3);
    expect(pixel(8, 8)[0]).toBeGreaterThan(100);
    expect(pixel(Math.floor(info.width / 2), Math.floor(info.height * 0.18))[0]).toBeGreaterThan(
      200,
    );
  });

  it("does not call the paper matte from compose", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "garment-stills.ts"),
      "utf8",
    );
    expect(source).toContain(".jpeg(");
    expect(source).not.toContain("matteConnectedBackground");
  });
});
