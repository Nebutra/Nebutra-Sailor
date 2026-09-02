import sharp from "sharp";
import { type IdPhotoSku, resolveIdPhotoPrint, skuPixelSize } from "@/catalog/skus";
import { composeIdPhoto } from "./id-photo";

export const SKU_SAMPLE_SCALE = 2;

export function skuSampleSourceFile(sku: IdPhotoSku): string {
  if (sku.look === "linkedin") {
    return `portrait-linkedin-${sku.background}-${sku.garmentId ?? "blazer"}.jpg`;
  }
  return sku.background === "blue" ? "portrait-id-blue.jpg" : "portrait-id-white.jpg";
}

export function skuSampleShootReferenceFile(sku: IdPhotoSku): string {
  if (sku.id === "linkedin-studio") {
    return "portrait-linkedin-smoke-blazer.jpg";
  }
  return skuSampleSourceFile(sku);
}

export async function composeSkuSampleJpeg(sku: IdPhotoSku, source: Buffer): Promise<Buffer> {
  const print = resolveIdPhotoPrint(sku);
  if (print.widthMm === print.heightMm || sku.look === "linkedin") {
    const pixels = skuPixelSize(print);
    return sharp(source)
      .rotate()
      .resize(pixels.width * SKU_SAMPLE_SCALE, pixels.height * SKU_SAMPLE_SCALE, {
        fit: "cover",
        position: "top",
      })
      .jpeg({ quality: sku.look === "linkedin" ? 95 : 90, mozjpeg: true })
      .toBuffer();
  }

  const result = await composeIdPhoto({ source, sku: print });
  return sharp(result.png)
    .resize(result.width * SKU_SAMPLE_SCALE, result.height * SKU_SAMPLE_SCALE)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
