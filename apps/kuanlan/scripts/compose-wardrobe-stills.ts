import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listGarmentSkus } from "../src/catalog/skus";
import { composeGarmentStill, garmentStillSourceFile } from "../src/lib/garment-stills";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/wardrobe");

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const sku of listGarmentSkus()) {
    const jpeg = await composeGarmentStill(
      readFileSync(join(samples, garmentStillSourceFile(sku.id))),
    );
    writeFileSync(join(outDir, `${sku.id}.jpg`), jpeg);
  }
}

main().catch((error) => {
  throw error;
});
