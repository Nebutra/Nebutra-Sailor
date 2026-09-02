import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { type GarmentId, getEnabledGarment, listGarmentSkus } from "../src/catalog/skus";
import {
  composeGarmentStill,
  GARMENT_SMOKE_RGB,
  garmentStillSourceFile,
} from "../src/lib/garment-stills";
import {
  garmentStillBrief,
  generateWithImage2,
  requireImage2,
  shootWithImage2,
} from "../src/lib/image2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "src/catalog/samples");
const outDir = join(root, "public/wardrobe");

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

async function flattenWardrobeRef(id: GarmentId): Promise<Buffer | null> {
  const jpeg = join(outDir, `${id}.jpg`);
  const png = join(outDir, `${id}.png`);
  const current = existsSync(jpeg) ? jpeg : existsSync(png) ? png : null;
  if (!current) {
    return null;
  }
  return sharp(current).flatten({ background: GARMENT_SMOKE_RGB }).jpeg({ quality: 95 }).toBuffer();
}

async function shootOne(id: GarmentId): Promise<void> {
  const sku = getEnabledGarment(id);
  const reference = await flattenWardrobeRef(sku.id);
  const shot = reference
    ? await shootWithImage2({
        image: reference,
        prompt: garmentStillBrief(sku.id, { reference: true }),
        size: "1024x1536",
        mimeType: "image/jpeg",
      })
    : await generateWithImage2({
        prompt: garmentStillBrief(sku.id),
        size: "1024x1536",
      });
  const jpeg = await sharp(shot).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  mkdirSync(samples, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(samples, garmentStillSourceFile(sku.id)), jpeg);
  writeFileSync(join(outDir, `${sku.id}.jpg`), await composeGarmentStill(jpeg));
  process.stdout.write(`${sku.id} ${shot.byteLength}\n`);
}

async function main() {
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, "../..", ".env.local"));
  requireImage2();

  const requested = process.argv[2];
  const ids = requested
    ? [getEnabledGarment(requested).id]
    : listGarmentSkus().map((sku) => sku.id);
  for (const id of ids) {
    await shootOne(id);
  }
}

main().catch((error) => {
  throw error;
});
