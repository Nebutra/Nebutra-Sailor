import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  getEnabledSku,
  resolveIdPhotoPrint,
  SkuUnavailableError,
  skuPixelSize,
} from "@/catalog/skus";
import { composeIdPhoto, InvalidPortraitError } from "./id-photo";

async function samplePortrait() {
  return sharp({
    create: {
      width: 400,
      height: 520,
      channels: 3,
      background: { r: 210, g: 48, b: 48 },
    },
  })
    .png()
    .toBuffer();
}

describe("composeIdPhoto", () => {
  it("prints an enabled spec at exact millimetre pixels", async () => {
    const sku = resolveIdPhotoPrint("id-white", "1in");
    const result = await composeIdPhoto({
      source: await samplePortrait(),
      sku,
    });
    const expected = skuPixelSize(sku);
    const meta = await sharp(result.png).metadata();

    expect(result.width).toBe(expected.width);
    expect(result.height).toBe(expected.height);
    expect(meta.width).toBe(295);
    expect(meta.height).toBe(413);
    expect(meta.density).toBe(300);
  });

  it("keeps specified background on the canvas corners", async () => {
    const sku = resolveIdPhotoPrint("id-blue", "2in");
    const result = await composeIdPhoto({
      source: await samplePortrait(),
      sku,
    });
    const { data, info } = await sharp(result.png).raw().toBuffer({ resolveWithObject: true });
    const last = (info.width * info.height - 1) * info.channels;

    expect(data[0]).toBe(67);
    expect(data[1]).toBe(142);
    expect(data[2]).toBe(219);
    expect(data[last]).toBe(67);
    expect(data[last + 1]).toBe(142);
    expect(data[last + 2]).toBe(219);
  });

  it("does not paint a CV studio canvas behind 领证照", async () => {
    const red = await sharp({
      create: {
        width: 240,
        height: 360,
        channels: 4,
        background: { r: 210, g: 48, b: 48, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const cutout = await sharp(red)
      .extend({
        top: 80,
        bottom: 80,
        left: 80,
        right: 80,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const result = await composeIdPhoto({
      source: cutout,
      sku: resolveIdPhotoPrint("linkedin-studio"),
    });
    const { data, info } = await sharp(result.png).raw().toBuffer({ resolveWithObject: true });
    const corner = 0;

    expect(info.width).toBe(472);
    expect(data[corner]).not.toBe(42);
    expect(data[corner + 1]).not.toBe(64);
    expect(data[corner + 2]).not.toBe(102);
  });

  it("prints 领证照 across the frame, not a stamp on the studio canvas", async () => {
    const sku = resolveIdPhotoPrint("linkedin-studio");
    const result = await composeIdPhoto({
      source: await samplePortrait(),
      sku,
    });
    const { data, info } = await sharp(result.png).raw().toBuffer({ resolveWithObject: true });
    const inset =
      (Math.floor(info.height / 2) * info.width + Math.floor(info.width * 0.08)) * info.channels;

    expect(info.width).toBe(472);
    expect(info.height).toBe(591);
    expect(data[inset]).toBeGreaterThan(180);
    expect(data[inset + 1]).toBeLessThan(80);
    expect(data[inset + 2]).toBeLessThan(80);
  });

  it("places the portrait inside the frame", async () => {
    const sku = resolveIdPhotoPrint("id-white", "visa");
    const result = await composeIdPhoto({
      source: await samplePortrait(),
      sku,
    });
    const { data, info } = await sharp(result.png).raw().toBuffer({ resolveWithObject: true });
    const center =
      (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;

    expect(data[center]).toBeGreaterThan(180);
    expect(data[center + 1]).toBeLessThan(80);
    expect(data[center + 2]).toBeLessThan(80);

    const top = (0 * info.width + Math.floor(info.width / 2)) * info.channels;
    expect(data[top]).toBe(255);
    expect(data[top + 1]).toBe(255);
    expect(data[top + 2]).toBe(255);
  });

  it("refuses a closed size on a live SKU", () => {
    expect(getEnabledSku("id-blue").closedSizes).toContain("1in");
    expect(() => resolveIdPhotoPrint("id-blue", "1in")).toThrow(SkuUnavailableError);
  });

  it("refuses an unreadable portrait", async () => {
    await expect(
      composeIdPhoto({
        source: Buffer.from("not-an-image"),
        sku: resolveIdPhotoPrint("id-white", "passport"),
      }),
    ).rejects.toBeInstanceOf(InvalidPortraitError);
  });
});
