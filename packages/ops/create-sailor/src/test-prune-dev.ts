import type { NebutraConfig } from "./utils/config.js";
import { pruneTemplate } from "./utils/prune.js";

async function run() {
  const targetDir = "/tmp/sailor-test-3";
  const config = {
    orm: "none",
    database: "none",
    payment: "none",
    aiProvider: "none",
    i18n: false,
  };
  await pruneTemplate(targetDir, config as unknown as NebutraConfig);
}

run().catch(console.error);
