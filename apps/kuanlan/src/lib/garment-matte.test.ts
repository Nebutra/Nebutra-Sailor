import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { matteConnectedBackground } from "./garment-matte";

describe("garment matte", () => {
  it("clears a connected paper wall and keeps an inner light patch", async () => {
    const source = await sharp({
      create: {
        width: 80,
        height: 100,
        channels: 3,
        background: { r: 246, g: 244, b: 243 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 36,
              height: 48,
              channels: 3,
              background: { r: 20, g: 28, b: 70 },
            },
          })
            .png()
            .toBuffer(),
          left: 22,
          top: 26,
        },
        {
          input: await sharp({
            create: {
              width: 10,
              height: 8,
              channels: 3,
              background: { r: 250, g: 250, b: 250 },
            },
          })
            .png()
            .toBuffer(),
          left: 35,
          top: 34,
        },
      ])
      .png()
      .toBuffer();

    const matted = await matteConnectedBackground(source);
    const { data, info } = await sharp(matted).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    expect(info.channels).toBe(4);
    expect(pixel(2, 2)[3]).toBe(0);
    expect(pixel(77, 2)[3]).toBe(0);
    expect(pixel(40, 50)[3]).toBe(255);
    expect(pixel(40, 38)[3]).toBe(255);
  });
});
