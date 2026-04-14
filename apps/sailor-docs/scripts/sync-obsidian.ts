import * as path from "node:path";
import { fromVault } from "fumadocs-obsidian";

const vaultDir = path.resolve(process.cwd(), "obsidian-vault");

await fromVault({
  dir: vaultDir,
  out: {
    contentDir: path.resolve(process.cwd(), "content/docs/zh"),
    publicDir: path.resolve(process.cwd(), "public"),
  },
});
