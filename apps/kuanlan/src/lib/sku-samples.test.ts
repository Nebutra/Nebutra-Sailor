import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getEnabledSku } from "@/catalog/skus";
import {
  composeSkuSampleJpeg,
  skuSampleShootReferenceFile,
  skuSampleSourceFile,
} from "./sku-samples";

describe("sku sample compose", () => {
  it("keeps id samples on the print frame, not a full-bleed attention crop", async () => {
    const sku = getEnabledSku("id-white");
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

    expect(info.width).toBe(590);
    expect(info.height).toBe(826);
    expect(data[top]).toBeGreaterThan(240);
    expect(data[top + 1]).toBeGreaterThan(240);
    expect(data[top + 2]).toBeGreaterThan(240);
  });

  it("scales 质感蓝 from the image2 frame, not a painted navy canvas", async () => {
    const sku = getEnabledSku("linkedin-studio");
    const source = await sharp({
      create: {
        width: 400,
        height: 600,
        channels: 3,
        background: { r: 16, g: 180, b: 90 },
      },
    })
      .jpeg()
      .toBuffer();
    const jpeg = await composeSkuSampleJpeg(sku, source);
    const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
    const last = (info.width * info.height - 1) * info.channels;

    expect(info.width).toBe(944);
    expect(info.height).toBe(1182);
    expect(data[0]).toBeGreaterThan(10);
    expect(data[0]).toBeLessThan(30);
    expect(data[1]).toBeGreaterThan(170);
    expect(data[2]).toBeGreaterThan(80);
    expect(data[2]).toBeLessThan(100);
    expect(data[last + 1]).toBeGreaterThan(170);
    expect(data[0]).not.toBe(42);
    expect(data[last]).not.toBe(42);
  });

  it("keeps 质感蓝 as a full 领证照, not a small print on navy", async () => {
    const sku = getEnabledSku("linkedin-studio");
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../catalog/samples", skuSampleSourceFile(sku)),
    );
    const jpeg = await composeSkuSampleJpeg(sku, source);
    const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
    let painted = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] === 42 && data[i + 1] === 64 && data[i + 2] === 102) painted += 1;
    }

    expect(info.width).toBe(944);
    expect(info.height).toBe(1182);
    expect(painted / (info.width * info.height)).toBeLessThan(0.01);
  });

  it("maps white id specs onto the white source portrait", () => {
    expect(skuSampleSourceFile(getEnabledSku("id-white"))).toBe("portrait-id-white.jpg");
    expect(skuSampleSourceFile(getEnabledSku("id-blue"))).toBe("portrait-id-blue.jpg");
    expect(skuSampleSourceFile(getEnabledSku("linkedin-studio"))).toBe(
      "portrait-linkedin-studio-blazer.jpg",
    );
    expect(skuSampleShootReferenceFile(getEnabledSku("linkedin-studio"))).toBe(
      "portrait-linkedin-smoke-blazer.jpg",
    );
  });

  it("lets image2 shoot 质感蓝 instead of composing a cutout", () => {
    const script = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../scripts/shoot-sku-sample.ts"),
      "utf8",
    );
    expect(script).toContain("generateWithImage2");
    expect(script).toContain("idPhotoCatalogBrief");
    expect(script).toContain("shootWithImage2");
    expect(script).toContain("idPhotoShootBrief");
    expect(script).toContain("skuSampleShootReferenceFile");
    expect(script).not.toContain("sharp.trim");
    expect(script).not.toContain(".composite(");
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
