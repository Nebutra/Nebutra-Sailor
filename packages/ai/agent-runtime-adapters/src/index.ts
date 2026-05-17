/**
 * @nebutra/agent-runtime-adapters — concrete, reusable port adapters.
 *
 * `@nebutra/agent-runtime` is deliberately dependency-free and ships only
 * injectable ports. This package supplies the concrete wirings so any
 * app/backend can reuse them instead of re-implementing glue:
 *
 *  - `./mcp-catalog`    — McpServerCatalogPort + McpClientLike over @nebutra/mcp
 *  - `./dispatcher-sse` — runtime-agnostic SSE transport for ProtocolDispatcher
 *
 * The durable rollout-store backend adapter is pending a governance decision
 * (a correct system-of-record needs a fail-loud datastore; @nebutra/audit's
 * log() swallows transient failures and is not suitable as source-of-truth).
 */

export * from "./dispatcher-sse.js";
export * from "./mcp-catalog.js";
