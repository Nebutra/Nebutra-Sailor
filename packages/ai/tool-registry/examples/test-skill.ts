import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolRegistry } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "tool-registry-"));
const registry = await ToolRegistry.open(root, { tenantId: "demo" });

await registry.newSkill("pitch_deck");

process.stdout.write(`${JSON.stringify(await registry.test("pitch_deck"), null, 2)}\n`);
await registry.close();
