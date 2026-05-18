# @nebutra/mcp

Status: **WIP**

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

Model Context Protocol (MCP) for AI agent tool calling.

## Installation

```bash
pnpm add @nebutra/mcp
```

## Features

- **MCP Client** — Execute tools across registered servers
- **Server Registry** — Manage internal and external MCP servers
- **Middleware** — Rate limiting, audit logging, access control
- **Plan-based Access** — Tool access based on subscription tier

## Architecture

```
Agent → MCPClient → ServerRegistry → MCP Servers
                  ↓
            Middleware (rate-limit, audit, access-control)
```

## Usage

### Initialize

```typescript
import { mcpClient, registerInternalServers } from "@nebutra/mcp";

// Register built-in servers
registerInternalServers();
```

### Execute Tools

```typescript
const result = await mcpClient.executeTool(
  "generate_text",
  { prompt: "Write a product description" },
  {
    requestId: "req-123",
    tenantId: "org_456",
    plan: "PRO",
  },
);
```

### Available Tools

| Tool              | Plan       | Description         |
| ----------------- | ---------- | ------------------- |
| `generate_text`   | FREE       | AI text generation  |
| `translate`       | FREE       | AI translation      |
| `embed_text`      | FREE       | Generate embeddings |
| `recommend_items` | PRO        | Get recommendations |
| `sync_products`   | PRO        | E-commerce sync     |
| `mint_nft`        | ENTERPRISE | Web3 minting        |

## Plan-based Access Control

```typescript
const plans = {
  FREE: ["generate_text", "translate", "embed_text", "content_*"],
  PRO: ["*_recommend_*", "*_ecommerce_*", ...FREE],
  ENTERPRISE: ["*_web3_*", ...PRO],
};
```

## Register Custom Server

```typescript
import { serverRegistry } from "@nebutra/mcp";

serverRegistry.register({
  name: "custom-tools",
  url: "http://localhost:3001/mcp",
  tools: [
    {
      name: "custom_tool",
      description: "My custom tool",
      parameters: { type: "object", properties: {} },
    },
  ],
  allowedPlans: ["PRO", "ENTERPRISE"],
});
```

## Middleware

### Rate Limiting

```typescript
// Configured per tool
const limits = {
  generate_text: { requests: 100, window: "1m" },
  embed_text: { requests: 1000, window: "1h" },
};
```

### Audit Logging

All tool executions are logged:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "tool": "generate_text",
  "tenantId": "org_456",
  "userId": "user_123",
  "duration": 245,
  "success": true
}
```

## Related

- [AI service](../../backends/python/ai/)
- [API Gateway](../../backends/gateway/)
