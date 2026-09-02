import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { upload } from "@nebutra/storage";
import {
  CDN_ASSET_BUCKET,
  CDN_CACHE_CONTROL,
  type CdnSeedObject,
  listPublicCdnSeedObjects,
} from "./cdn-public-assets";

const CONCURRENCY = 4;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}

async function mapPool<T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await worker(item);
      }
    }),
  );
}

async function seedWithStorage(objects: readonly CdnSeedObject[]) {
  await mapPool(objects, async (object) => {
    const stored = await upload(object.key, readFileSync(object.file), {
      bucket: "assets",
      contentType: object.contentType,
      cacheControl: CDN_CACHE_CONTROL,
      metadata: { kind: "public-cdn" },
    });
    process.stdout.write(`${stored.key} ${stored.url}\n`);
  });
}

function wranglerPut(object: CdnSeedObject, bucket: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket}/${object.key}`,
        "--file",
        object.file,
        "--content-type",
        object.contentType,
        "--cache-control",
        CDN_CACHE_CONTROL,
        "--remote",
      ],
      { cwd: repoRoot, env: process.env },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("exit", (status) => {
      if (status === 0) {
        process.stdout.write(`${object.key} ok\n`);
        resolve();
        return;
      }
      reject(new Error(stderr || `wrangler_put_failed:${object.key}`));
    });
  });
}

async function seedWithWrangler(objects: readonly CdnSeedObject[]) {
  const bucket = process.env.R2_BUCKET_ASSETS || CDN_ASSET_BUCKET;
  await mapPool(objects, (object) => wranglerPut(object, bucket));
}

async function main() {
  loadEnvFile(join(repoRoot, ".env.local"));
  loadEnvFile(join(repoRoot, "apps/kuanlan/.env.local"));

  const objects = listPublicCdnSeedObjects(repoRoot);
  process.stdout.write(`seeding ${objects.length} objects\n`);

  if (isR2Configured()) {
    await seedWithStorage(objects);
    return;
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    await seedWithWrangler(objects);
    return;
  }
  throw new Error("r2_unconfigured");
}

main().catch((error) => {
  throw error;
});
