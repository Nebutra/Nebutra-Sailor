import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getEnabledSku, SKUS, SkuUnavailableError, skuPixelSize } from "@/catalog/skus";
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
    const sku = getEnabledSku("cn-1in-white");
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
    const sku = getEnabledSku("cn-2in-blue");
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

  it("places the portrait inside the frame", async () => {
    const sku = getEnabledSku("visa-us");
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
  });

  it("refuses a disabled spec even if the object is passed in", async () => {
    const closed = SKUS.find((sku) => sku.id === "cn-1in-blue");
    if (!closed) {
      throw new Error("cn-1in-blue must stay in the catalog as a closed spec");
    }

    await expect(
      composeIdPhoto({
        source: await samplePortrait(),
        sku: closed,
      }),
    ).rejects.toBeInstanceOf(SkuUnavailableError);
  });

  it("refuses an unreadable portrait", async () => {
    await expect(
      composeIdPhoto({
        source: Buffer.from("not-an-image"),
        sku: getEnabledSku("passport-cn"),
      }),
    ).rejects.toBeInstanceOf(InvalidPortraitError);
  });
});
