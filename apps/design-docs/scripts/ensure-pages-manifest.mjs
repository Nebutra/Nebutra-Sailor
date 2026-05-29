import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverDir = join(process.cwd(), ".next", "server");
const manifestPath = join(serverDir, "pages-manifest.json");

await mkdir(serverDir, { recursive: true });
await writeFile(manifestPath, "{}\n", { flag: "wx" }).catch((error) => {
  if (error && error.code === "EEXIST") return;
  throw error;
});
