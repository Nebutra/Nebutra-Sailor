import { InMemoryToolConsentStore, McpHost } from "../src/index";

const consent = new InMemoryToolConsentStore();
const host = new McpHost({ consent });

host.connectLocal({
  id: "notes",
  name: "Notes",
  description: "Tenant-scoped note tools",
  manifest: { name: "notes", version: "1.0.0", scopes: ["notes:write"] },
  tools: [{ name: "create_note", description: "Create a note" }],
  handlers: {
    create_note: async (args) => ({ id: "note_1", title: args.title }),
  },
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

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
