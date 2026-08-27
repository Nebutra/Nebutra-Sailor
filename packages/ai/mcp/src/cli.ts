import { McpHost, readToolDebug } from "./index";
import { createContextServerHandlers } from "./server/contextServer";

const command = process.argv[2] ?? "doctor";
const host = new McpHost();
const contextHandlers = createContextServerHandlers(process.cwd());

host.connectLocal({
  id: "nebutra-context",
  name: "Nebutra Context",
  description: "Read-only project context tools",
  manifest: {
    name: "nebutra-context",
    version: "1.0.0",
    scopes: ["project:read"],
  },
  tools: [
    {
      name: "get_project_structure",
      description: "Returns a bounded app/package routing tree for the current project.",
      parameters: {},
    },
  ],
  handlers: {
    get_project_structure: async () => contextHandlers.callTool({ name: "get_project_structure" }),
  },
});

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "tool-protocol", ...(await host.doctor()) }, null, 2)}\n`,
  );
} else if (command === "debug") {
  const id = process.argv[3];
  const entries = await readToolDebug(id ? 50 : 10);
  process.stdout.write(
    `${JSON.stringify({ capability: "tool-protocol", id, entries }, null, 2)}\n`,
  );
} else if (command === "inspect") {
  const serverId = process.argv[3] ?? "nebutra-context";
  process.stdout.write(
    `${JSON.stringify({ capability: "tool-protocol", server: host.inspect(serverId) }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown tool-protocol command: ${command}\n`);
  process.exitCode = 1;
}
