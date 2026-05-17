# tool-registry Replication Guide

```ts
import { ToolRegistry } from "@nebutra/tool-registry";

const registry = await ToolRegistry.open(".nebutra/skills", { tenantId: "demo" });

await registry.writeSkill(
  "landing_page",
  "---\nname: landing_page\ndescription: Build a landing page\nversion: 1.0.0\nallowed_tools: []\nmcp_servers: []\n---\n## What this skill does\nCreate an implementation plan.",
);

const all = await registry.list();
const loaded = await registry.load("landing_page");

console.log(all, loaded.body);
```

## Run it

```bash
pnpm skill:new landing_page
pnpm skill:list
pnpm skill:test landing_page
tsx packages/ai/tool-registry/examples/progressive-load.ts
```

## Goal

Keep procedural knowledge in portable `SKILL.md` directories and load it progressively so agent context is not flooded.

## Replication steps

1. Open a tenant-scoped registry.
2. Add or install a skill.
3. List metadata only.
4. Load a body only when selected.
5. Run the skill test report before distribution.

## Expected result

The quickstart lists metadata immediately, then loads the selected skill body on demand.
