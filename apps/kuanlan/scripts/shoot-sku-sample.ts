import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getEnabledSku, resolveIdPhotoPrint } from "../src/catalog/skus";
import {
  generateWithImage2,
  idPhotoCatalogBrief,
  idPhotoShootBrief,
  image2SizeForSku,
  requireImage2,
  shootWithImage2,
} from "../src/lib/image2";
import {
  composeSkuSampleJpeg,
  skuSampleShootReferenceFile,
  skuSampleSourceFile,
} from "../src/lib/sku-samples";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/skus");

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const text = line.trim();
    if (!text || text.startsWith("#") || !text.includes("=")) {
      continue;
    }
    const index = text.indexOf("=");
    const key = text.slice(0, index);
    let value = text.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, "../..", ".env.local"));
  requireImage2();

  const skuId = process.argv[2] || "linkedin-studio";
  const sku = getEnabledSku(skuId);
  if (sku.kind !== "id-photo") {
    throw new Error(`not_an_id_photo:${skuId}`);
  }

  const print = resolveIdPhotoPrint(sku);
  const nativeFrame = sku.look === "linkedin" && sku.background === "studio";
  const shot = nativeFrame
    ? await generateWithImage2({
        prompt: idPhotoCatalogBrief(sku),
        size: image2SizeForSku(print),
      })
    : await shootWithImage2({
        image: readFileSync(join(samples, skuSampleShootReferenceFile(sku))),
        prompt: idPhotoShootBrief(sku),
        size: image2SizeForSku(print),
        mimeType: "image/jpeg",
      });
  const portrait = await sharp(shot).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  writeFileSync(join(samples, skuSampleSourceFile(sku)), portrait);
  writeFileSync(join(outDir, `${sku.id}.jpg`), await composeSkuSampleJpeg(sku, portrait));
  process.stdout.write(`${sku.id} ${shot.byteLength}\n`);
}

main().catch((error) => {
  throw error;
});
