import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolRegistry } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "tool-registry-"));
const registry = await ToolRegistry.open(root, { tenantId: "demo" });

await registry.newSkill("brand_film_60s");

process.stdout.write(`${JSON.stringify(await registry.list(), null, 2)}\n`);
await registry.close();
