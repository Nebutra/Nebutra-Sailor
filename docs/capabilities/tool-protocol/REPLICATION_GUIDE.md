# tool-protocol Replication Guide

```ts
import { InMemoryToolConsentStore, McpHost } from "@nebutra/mcp";

const consent = new InMemoryToolConsentStore();
const host = new McpHost({ consent });

host.connectLocal({
  id: "notes",
  name: "Notes",
  description: "Tenant-scoped note tools",
  manifest: { name: "notes", version: "1.0.0", scopes: ["notes:write"] },
  tools: [{ name: "create_note", description: "Create a note" }],
  handlers: { create_note: async (args) => ({ id: "note_1", title: args.title }) },
});

await consent.grant({
  tenantId: "demo",
  serverId: "notes",
  toolName: "create_note",
  scopes: ["notes:write"],
});

const result = await host.callTool(
  "notes:create_note",
  { title: "Layer 1" },
  { requestId: "example_1", tenantId: "demo" },
);

console.log(result);
```

## Run it

```bash
pnpm tool:doctor
pnpm tool:inspect nebutra-context
pnpm tool:debug
tsx packages/ai/mcp/examples/local-consent.ts
```

## Goal

Give agents one safe channel for external tools. Internal code stays native; cross-process, remote, and third-party tools go through this protocol host.

## Replication steps

1. Connect a server with `manifest.name`, `manifest.version`, and `manifest.scopes`.
2. Grant tenant-scoped consent for the exact tool.
3. Call the tool through `McpHost.callTool`.
4. Inspect `.nebutra/debug/tool-protocol.jsonl` for the call record.

## Expected result

The example returns `success: true` and writes a debug row with `serverId`, `toolName`, `tenantId`, duration, and outcome.
