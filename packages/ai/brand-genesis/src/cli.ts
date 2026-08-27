import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { BrandGenesis, readBrandGenesisDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.BRAND_GENESIS_ROOT ?? ".nebutra/brand-genesis";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireCliLock(rootPath: string): Promise<() => Promise<void>> {
  const lockPath = join(rootPath, ".cli.lock");
  await mkdir(rootPath, { recursive: true });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await mkdir(lockPath);
      return async () => {
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      const lockStat = await stat(lockPath).catch(() => ({ mtimeMs: Date.now() }));
      if (Date.now() - lockStat.mtimeMs > 30_000) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }
      await sleep(50);
    }
  }
  throw new Error("brand-genesis CLI is busy. Suggestion: wait a moment and retry the command.");
}

if (command === "doctor") {
  const releaseLock = await acquireCliLock(root);
  const genesis = await BrandGenesis.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await genesis.doctor(), null, 2)}\n`);
  } finally {
    await genesis.close();
    await releaseLock();
  }
} else if (command === "quickstart") {
  const idea = process.argv.slice(3).join(" ") || "AI debugging for indie devs called Loop";
  const releaseLock = await acquireCliLock(root);
  const genesis = await BrandGenesis.open(root, { tenantId });
  try {
    process.stdout.write(
      `${JSON.stringify({ capability: "brand-genesis", result: await genesis.run({ idea }) }, null, 2)}\n`,
    );
  } finally {
    await genesis.close();
    await releaseLock();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "brand-genesis", entries: await readBrandGenesisDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown brand-genesis command: ${command}\n`);
  process.exitCode = 1;
}
