import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolRegistry } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "tool-registry-"));
const registry = await ToolRegistry.open(root, { tenantId: "demo" });

await registry.writeSkill(
  "landing_page",
  "---\nname: landing_page\ndescription: Build a landing page\nversion: 1.0.0\nallowed_tools: []\nmcp_servers: []\n---\n## What this skill does\nCreate an implementation plan.",
);

const listed = await registry.list();
const loaded = await registry.load("landing_page");

process.stdout.write(`${JSON.stringify({ listed, loaded }, null, 2)}\n`);
await registry.close();
