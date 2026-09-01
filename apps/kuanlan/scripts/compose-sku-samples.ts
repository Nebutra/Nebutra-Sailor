import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { type IdPhotoSku, listIdPhotoSkus, skuPixelSize } from "../src/catalog/skus";
import { ID_PHOTO_BACKGROUNDS } from "../src/lib/id-photo";

const SCALE = 2;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/skus");

function sourceFile(sku: IdPhotoSku): string {
  if (sku.look === "linkedin") {
    return `portrait-linkedin-${sku.background}-${sku.garmentId ?? "blazer"}.jpg`;
  }
  return sku.background === "blue" ? "portrait-id-blue.jpg" : "portrait-id-white.jpg";
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const sku of listIdPhotoSkus()) {
    const { width, height } = skuPixelSize(sku);
    const jpeg = await sharp(readFileSync(join(samples, sourceFile(sku))))
      .rotate()
      .resize(width * SCALE, height * SCALE, {
        fit: "cover",
        position: "attention",
      })
      .flatten({ background: ID_PHOTO_BACKGROUNDS[sku.background] })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    writeFileSync(join(outDir, `${sku.id}.jpg`), jpeg);
  }
}

main().catch((error) => {
  throw error;
});
