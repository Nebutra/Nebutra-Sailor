---
"@nebutra/agent-runtime": minor
---

New adapter subpaths inside `@nebutra/agent-runtime`: concrete reusable port
adapters for the runtime package.

- `mcp-catalog`: adapts `@nebutra/mcp` `serverRegistry`/`mcpClient` into the
  `McpServerCatalogPort` / `McpClientLike` ports — plan-gated, tenant
  fail-closed, schema-less MCP tools still yield usable definitions,
  composes with `activateMcpTools`.
- `dispatcher-sse`: runtime-agnostic transport for `ProtocolDispatcher` using
  only Web-standard `Request`/`Response` — JSON-RPC handler (never throws),
  incremental `text/event-stream` SSE with error-frame + `AbortSignal`
  cancellation, listener→async-iterable notification bridge.

Dependency-injected (no hidden globals), tenant fail-closed, zero framework
lock-in. The durable rollout-store backend adapter is intentionally not
included (a correct system-of-record needs a fail-loud datastore; pending a
governance decision — documented in the README).
