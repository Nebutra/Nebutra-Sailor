import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { KnowledgeBase, readKnowledgeBaseDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.KNOWLEDGE_BASE_ROOT ?? ".nebutra/knowledge-base";
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
      const ageMs =
        Date.now() - (await stat(lockPath).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs;
      if (ageMs > 30_000) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }
      await sleep(50);
    }
  }
  throw new Error("knowledge-base CLI is busy. Suggestion: wait a moment and retry the command.");
}

const releaseLock = await acquireCliLock(root);
const kb = await KnowledgeBase.open(root, { tenantId });

try {
  if (command === "doctor") {
    process.stdout.write(`${JSON.stringify(await kb.doctor(), null, 2)}\n`);
  } else if (command === "sync") {
    const connector = process.argv[3];
    if (!connector) {
      process.stderr.write("Usage: pnpm kb:sync <connector>\n");
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `${JSON.stringify({ capability: "knowledge-base", result: await kb.syncConnector(connector) }, null, 2)}\n`,
      );
    }
  } else if (command === "stats") {
    process.stdout.write(`${JSON.stringify(await kb.stats(), null, 2)}\n`);
  } else if (command === "explain") {
    const query = process.argv.slice(3).join(" ") || "pricing decision";
    process.stdout.write(`${JSON.stringify(await kb.explain({ text: query }), null, 2)}\n`);
  } else if (command === "debug") {
    process.stdout.write(
      `${JSON.stringify({ capability: "knowledge-base", entries: await readKnowledgeBaseDebug() }, null, 2)}\n`,
    );
  } else {
    process.stderr.write(`Unknown knowledge-base command: ${command}\n`);
    process.exitCode = 1;
  }
} finally {
  await kb.close();
  await releaseLock();
}
