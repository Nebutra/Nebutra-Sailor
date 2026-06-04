# @nebutra/mcp

Model Context Protocol primitives for Nebutra agent and tool surfaces.

This package provides a registry, client, middleware, consent store, debug
helpers, and internal-server registration seams around the official
`@modelcontextprotocol/sdk` runtime.

## Status: WIP

Experimental public package. The package is published for reuse and contribution
intake, but its package metadata still marks these production gaps explicitly:

- no production app integrations yet
- no production MCP transports beyond HTTP/local seams
- no durable remote tool discovery or app-level integration layer

Use it for local tools, integration prototypes, and package development. Keep
production deployments behind the application-level gateway and approval model.

## Installation

```bash
pnpm add @nebutra/mcp
```

## Exports

| Path | Description |
| --- | --- |
| `@nebutra/mcp` | Main registry, client, host, consent, debug, middleware, server, and type exports |
| `@nebutra/mcp/client` | `MCPClient` and the shared `mcpClient` instance |
| `@nebutra/mcp/server` | Internal server registration helpers |
| `@nebutra/mcp/middleware` | Rate-limit, audit, access-control, and middleware composition helpers |

## Usage

### Register a local server

```ts
import { MCPClient, serverRegistry } from "@nebutra/mcp";

serverRegistry.register({
  id: "workspace",
  name: "Workspace tools",
  description: "Local workspace utility tools",
  endpoint: "local",
  transport: "local",
  tools: [
    {
      name: "echo",
      description: "Return the provided message",
      parameters: {
        message: { type: "string", required: true },
      },
      allowedPlans: ["PRO", "ENTERPRISE"],
    },
  ],
  handlers: {
    echo: (args) => ({ message: args.message }),
  },
  allowedPlans: ["PRO", "ENTERPRISE"],
});

const client = new MCPClient(serverRegistry);
const result = await client.executeTool(
  "workspace:echo",
  { message: "hello" },
  {
    requestId: "req_123",
    tenantId: "org_123",
    userId: "user_123",
    plan: "PRO",
  },
);
```

### Register built-in servers

```ts
import { getInternalServerIds, registerInternalServers } from "@nebutra/mcp";

registerInternalServers();
const internalServerIds = getInternalServerIds();
```

### Compose middleware

```ts
import {
  composeMCPMiddleware,
  createAccessControlMiddleware,
  createAuditMiddleware,
  createRateLimitMiddleware,
} from "@nebutra/mcp/middleware";

const middleware = composeMCPMiddleware([
  createRateLimitMiddleware({ maxRequests: 100, windowMs: 60_000 }),
  createAccessControlMiddleware({ blockedTools: [] }),
  createAuditMiddleware({ onLog: (entry) => auditSink.write(entry) }),
]);
```

## Runtime Notes

- HTTP execution uses `StreamableHTTPClientTransport` from the official MCP SDK.
- Local execution resolves registered handlers directly.
- WebSocket execution is not implemented in this package.
- `stdio` execution is rejected for browser/serverless contexts.
- Tool access is checked at both server and tool level for plan, tenant, and
  permission gates.

## License

MIT
