# tool-protocol Capability Map

## Decision

WRAP. The protocol layer upgrades the existing `@nebutra/mcp` package instead of creating a second protocol stack.

## Depends on

- `llm-gateway`
- `trace-store`
- `event-log`

## Three-tier map

| Tier | Scope | Landing |
| --- | --- | --- |
| SKIP | Internal function calls | Keep native TypeScript/Rust calls |
| WRAP | External tool servers, stdio, Streamable HTTP, consent, trace | `packages/ai/mcp` |
| PORT | None | Not needed |

## Public contract

- `McpHost`
- `host.connectLocal(...)`
- `host.connectStdio(command, args, manifest)`
- `host.connectStreamableHttp(endpoint, manifest)`
- `host.callTool(tool, args, { tenantId, requestId })`
- `InMemoryToolConsentStore`
- `pnpm tool:doctor`
- `pnpm tool:inspect <server>`
- `pnpm tool:debug`

## Multi-tenant posture

Tool calls require tenant context. A call without `tenantId` returns a suggestion-bearing failure and is not executed.

## Audit posture

Every host call writes `.nebutra/debug/tool-protocol.jsonl`. When a trace/event-log instance is injected, calls also emit a tool span and append an immutable event.
