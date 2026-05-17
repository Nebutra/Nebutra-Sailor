import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "content-store-"));
const store = await ContentStore.open(root, { tenantId: "demo" });

await writeFile(join(store.filesRoot(), "external.md"), "A file changed outside the API.", "utf8");
await store.reindex();

process.stdout.write(`${JSON.stringify(await store.search().query("outside").topK(1), null, 2)}\n`);
await store.close();
