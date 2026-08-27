import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "content-store-"));
const store = await ContentStore.open(root, { tenantId: "demo" });

await store.write("company/brand.md", "---\nschema: brand_profile\n---\nCyberpunk visual style.");
await store.write("notes/plain.md", "Cyberpunk but no schema.");

const hits = await store.search().query("cyberpunk").filter({ schema: "brand_profile" }).topK(5);
process.stdout.write(`${JSON.stringify(hits, null, 2)}\n`);
await store.close();
