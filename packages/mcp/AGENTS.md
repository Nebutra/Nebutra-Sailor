# AGENTS.md — packages/mcp

Execution contract for Nebutra's Model Context Protocol package.

## Scope

Applies to everything under `packages/mcp/`.

This package owns checked-in MCP request and server types, the client runtime,
middleware composition, in-process server registry, and the internal-server
catalog exposed through MCP. It is an integration boundary and is still `wip`,
not a production-complete tool platform.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical MCP types, tool definitions, request/response shapes, and server
  config contract: `src/types.ts`
- Client runtime and shared singleton: `src/client/mcpClient.ts`,
  `src/client/index.ts`
- Middleware composition, access control, audit, and rate-limit behavior:
  `src/middleware/mcpMiddleware.ts`, `src/middleware/index.ts`
- Server registry and registration semantics:
  `src/registry/serverRegistry.ts`, `src/registry/index.ts`
- Checked-in internal server catalog and registration entrypoint:
  `src/server/internalServers.ts`, `src/server/index.ts`
- Context server runtime entrypoint: `src/server/contextServer.ts`

Treat `README.md` as descriptive only. If package behavior and docs disagree,
update the source files above instead of preserving stale examples.

## Contract Boundaries

- Keep `package.json` exports, `src/index.ts`, and the `bin` contract aligned.
  Public changes here affect client, middleware, and server consumers at once.
- Treat `src/types.ts` as the canonical contract for tool definitions, request
  envelopes, execution results, and server registration. Tightening those
  shapes is a compatibility change.
- Preserve the split between outbound client runtime, middleware pipeline, and
  registry/server concerns. Client transport logic belongs in `src/client/`,
  middleware semantics in `src/middleware/`, and checked-in server catalogs in
  `src/server/` plus `src/registry/`.
- Keep internal server declarations centralized in `src/server/internalServers.ts`.
  Do not scatter internal MCP server metadata through apps or docs.
- Respect the package's current `wip` status. The context server binary and
  plan-based access control are not complete; do not document or code against
  stronger production guarantees than the package actually provides.

## Generated And Derived Files

- `dist/` is derived build output from `tsup`.
- The prepared `dist/server/contextServer.js` binary artifact is generated and
  may be a placeholder stub before a full build.
- Do not hand-edit emitted build output or generated CLI artifacts. Update the
  source files above and rebuild instead.

## Validation

- Type or middleware/registry/client contract changes:
  `pnpm --filter @nebutra/mcp typecheck`
- Server entrypoint, subpath export, or bin changes:
  `pnpm --filter @nebutra/mcp build`
