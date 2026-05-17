import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "content-store-"));
const store = await ContentStore.open(root, { tenantId: "demo" });

await store.write("hello.md", "hi from Layer 0");
const hits = await store.search().query("hi").topK(3);

process.stdout.write(`${JSON.stringify(hits, null, 2)}\n`);
await store.close();
