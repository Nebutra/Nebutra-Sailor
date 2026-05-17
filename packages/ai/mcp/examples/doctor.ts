import { McpHost } from "../src/index";

const host = new McpHost();

host.connectLocal({
  id: "read-only",
  name: "Read Only",
  description: "Read-only example tools",
  manifest: { name: "read-only", version: "1.0.0", scopes: ["project:read"] },
  tools: [{ name: "ping", description: "Return pong" }],
  handlers: { ping: async () => "pong" },
});

process.stdout.write(`${JSON.stringify(await host.doctor(), null, 2)}\n`);
