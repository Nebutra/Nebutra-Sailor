import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listIdPhotoSkus } from "../src/catalog/skus";
import { composeSkuSampleJpeg, skuSampleSourceFile } from "../src/lib/sku-samples";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/skus");

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const sku of listIdPhotoSkus()) {
    const jpeg = await composeSkuSampleJpeg(
      sku,
      readFileSync(join(samples, skuSampleSourceFile(sku))),
    );
    writeFileSync(join(outDir, `${sku.id}.jpg`), jpeg);
  }
}

main().catch((error) => {
  throw error;
});
