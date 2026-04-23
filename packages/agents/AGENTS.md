# AGENTS.md — packages/agents

Execution contract for Nebutra's multi-agent runtime package.

## Scope

Applies to everything under `packages/agents/`.

This package owns agent lifecycle, orchestration, routing, tenant-aware memory,
built-in tool stubs, and the shared AI SDK wrapper surface exported to the rest
of the repo. It is the runtime layer for agent execution, not the place for
app-specific prompts, UI behavior, or direct provider-specific business logic.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical agent and orchestration contracts: `src/types.ts`
- Base agent lifecycle, memory loading, usage emission, and billing hook:
  `src/agent.ts`
- Multi-agent routing, quota checks, chat/pipeline/broadcast semantics:
  `src/orchestrator.ts`, `src/router.ts`, `src/tenant.ts`
- Built-in tool catalog and current stub behavior: `src/tools.ts`
- Shared AI SDK wrapper config, model resolution, and provider helpers:
  `src/sdk/`
- Provider-specific runtime adapters: `src/providers/`
- Public API coverage for exported surface: `src/__tests__/public-api.test.ts`

Treat `README.md` as descriptive only. If docs drift, update the source files
above instead of preserving outdated examples.

## Contract Boundaries

- Keep `package.json` exports and `src/index.ts` aligned. Do not ask consumers
  to deep-import internals when a supported subpath export already exists.
- Treat `src/types.ts` as the canonical contract for agent config, context,
  memory, tool, usage, and orchestration semantics. Tightening these shapes is
  a cross-package compatibility change.
- Preserve the split between core runtime and provider adapters:
  `src/agent.ts`, `src/orchestrator.ts`, and `src/router.ts` own generic agent
  lifecycle semantics; `src/providers/` and `src/sdk/` own provider-specific
  runtime behavior.
- Keep quota and usage semantics centralized in `src/tenant.ts` and
  `src/agent.ts`. Do not scatter billing deduction or quota checks into callers.
- Keep built-in tools honest about current capability. `src/tools.ts` is still
  stub-oriented; do not document or code against live search, RAG, or SQL
  access unless the actual implementation is being added.
- Memory semantics belong in `src/memory.ts` and the base lifecycle in
  `src/agent.ts`. Do not invent parallel persistence paths in downstream apps.

## Generated And Derived Files

- Treat future `dist/` output from `tsup` as derived build output.
- Do not hand-edit temporary runtime logs, cached memory snapshots, or ad hoc
  generated provider metadata.
- If public runtime behavior changes, update the source files above and rebuild
  rather than patching emitted output.

## Validation

- Public API, routing, tool, or lifecycle changes:
  `pnpm --filter @nebutra/agents test`
- Export, type, or provider-surface changes:
  `pnpm --filter @nebutra/agents typecheck`
