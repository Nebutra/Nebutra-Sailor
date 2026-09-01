import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getEnabledSku } from "@/catalog/skus";
import { composeSkuSampleJpeg, skuSampleSourceFile } from "./sku-samples";

describe("sku sample compose", () => {
  it("keeps id samples on the print frame, not a full-bleed attention crop", async () => {
    const sku = getEnabledSku("passport-cn");
    const source = await sharp({
      create: {
        width: 400,
        height: 520,
        channels: 3,
        background: { r: 210, g: 48, b: 48 },
      },
    })
      .png()
      .toBuffer();
    const jpeg = await composeSkuSampleJpeg(sku, source);
    const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
    const top = Math.floor(info.width / 2) * info.channels;

    expect(info.width).toBe(780);
    expect(info.height).toBe(1134);
    expect(data[top]).toBeGreaterThan(240);
    expect(data[top + 1]).toBeGreaterThan(240);
    expect(data[top + 2]).toBeGreaterThan(240);
  });

  it("maps white id specs onto the white source portrait", () => {
    expect(skuSampleSourceFile(getEnabledSku("visa-us"))).toBe("portrait-visa-us.jpg");
    expect(skuSampleSourceFile(getEnabledSku("passport-cn"))).toBe("portrait-id-white.jpg");
    expect(skuSampleSourceFile(getEnabledSku("linkedin-studio"))).toBe(
      "portrait-linkedin-studio-blazer.jpg",
    );
  });

  it("does not full-bleed crop in the sample script", () => {
    const script = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../scripts/compose-sku-samples.ts"),
      "utf8",
    );
    expect(script).toContain("composeSkuSampleJpeg");
    expect(script).not.toContain("attention");
  });
});
