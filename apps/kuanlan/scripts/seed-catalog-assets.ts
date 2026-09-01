import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { upload } from "@nebutra/storage";
import {
  CATALOG_ASSET_BUCKET,
  CATALOG_CACHE_CONTROL,
  CATALOG_KINDS,
  type CatalogKind,
  catalogPublicFile,
  listCatalogSeedObjects,
} from "../src/lib/catalog-assets";
import { isR2Configured, ResourceStoreUnavailableError } from "../src/lib/resources";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../..");

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

function listPublicNames(kind: CatalogKind): string[] {
  const dir = join(root, "public", kind);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).filter((name) => !name.startsWith("."));
}

async function seedWithStorage() {
  const objects = listCatalogSeedObjects({
    orbit: listPublicNames("orbit"),
    skus: listPublicNames("skus"),
    wardrobe: listPublicNames("wardrobe"),
  });
  for (const object of objects) {
    const file = join(root, catalogPublicFile(object));
    const stored = await upload(object.key, readFileSync(file), {
      bucket: "assets",
      contentType: object.contentType,
      cacheControl: CATALOG_CACHE_CONTROL,
      metadata: { app: "kuanlan", kind: object.kind },
    });
    process.stdout.write(`${stored.key} ${stored.url}\n`);
  }
}

function seedWithWrangler() {
  const objects = listCatalogSeedObjects({
    orbit: listPublicNames("orbit"),
    skus: listPublicNames("skus"),
    wardrobe: listPublicNames("wardrobe"),
  });
  for (const object of objects) {
    const file = join(root, catalogPublicFile(object));
    const bucket = process.env.R2_BUCKET_ASSETS || CATALOG_ASSET_BUCKET;
    const result = spawnSync(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket}/${object.key}`,
        "--file",
        file,
        "--content-type",
        object.contentType,
        "--cache-control",
        CATALOG_CACHE_CONTROL,
        "--remote",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `wrangler_put_failed:${object.key}`);
    }
    process.stdout.write(`${object.key} ok\n`);
  }
}

async function main() {
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(repoRoot, ".env.local"));

  if (isR2Configured()) {
    await seedWithStorage();
    return;
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    seedWithWrangler();
    return;
  }
  throw new ResourceStoreUnavailableError();
}

main().catch((error) => {
  throw error;
});
