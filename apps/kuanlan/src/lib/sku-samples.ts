import sharp from "sharp";
import { type IdPhotoSku, skuPixelSize } from "@/catalog/skus";
import { composeIdPhoto } from "./id-photo";

export const SKU_SAMPLE_SCALE = 2;

export function skuSampleSourceFile(sku: IdPhotoSku): string {
  if (sku.id === "visa-us") {
    return "portrait-visa-us.jpg";
  }
  if (sku.look === "linkedin") {
    return `portrait-linkedin-${sku.background}-${sku.garmentId ?? "blazer"}.jpg`;
  }
  return sku.background === "blue" ? "portrait-id-blue.jpg" : "portrait-id-white.jpg";
}

export async function composeSkuSampleJpeg(sku: IdPhotoSku, source: Buffer): Promise<Buffer> {
  if (sku.widthMm === sku.heightMm) {
    const pixels = skuPixelSize(sku);
    return sharp(source)
      .rotate()
      .resize(pixels.width * SKU_SAMPLE_SCALE, pixels.height * SKU_SAMPLE_SCALE)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  }

  const result = await composeIdPhoto({ source, sku });
  return sharp(result.png)
    .resize(result.width * SKU_SAMPLE_SCALE, result.height * SKU_SAMPLE_SCALE)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
