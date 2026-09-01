import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { listPublicSkus, skuPixelSize } from "../src/catalog/skus";
import { ID_PHOTO_BACKGROUNDS } from "../src/lib/id-photo";

const SCALE = 2;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/skus");

const sources: Record<"white" | "blue" | "red", Buffer> = {
  white: readFileSync(join(samples, "portrait-white.jpg")),
  blue: readFileSync(join(samples, "portrait-blue.jpg")),
  red: readFileSync(join(samples, "portrait-white.jpg")),
};

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const sku of listPublicSkus()) {
    const { width, height } = skuPixelSize(sku);
    const jpeg = await sharp(sources[sku.background])
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
