# AGENTS.md — packages/cache

Execution contract for Nebutra's Redis-backed cache package.

## Scope

Applies to everything under `packages/cache/`.

This package owns shared Redis env resolution, the exported Redis client
singleton, and reusable cache strategy primitives. It is a low-level cache
abstraction layer, not a place for app-specific key policy, invalidation
workflows, or non-Redis provider orchestration.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Redis env aliases and credential resolution: `src/env.ts`
- Exported Redis client singleton: `src/client.ts`
- Strategy behavior and option contracts:
  `src/strategies/ttlCache.ts`,
  `src/strategies/lockCache.ts`,
  `src/strategies/lazyRefresh.ts`,
  `src/strategies/stampede.ts`

If cache semantics, env names, or strategy behavior changes, update the source
of truth here instead of patching downstream consumers.

## Contract Boundaries

- Keep this package Redis-specific unless the task is explicitly about adding a
  new provider boundary. Today the canonical runtime dependency is
  `@upstash/redis`.
- Preserve environment resolution in `src/env.ts`. Support for both
  `UPSTASH_REDIS_REST_*` and legacy `UPSTASH_REDIS_*` names is a compatibility
  contract, not an incidental detail.
- Keep package exports aligned with `src/index.ts`. Consumers should use the
  package entrypoint rather than deep-importing strategy files.
- Treat strategy classes as the canonical behavior contract:
  `TTLCache` defines graceful cache-miss behavior on Redis failures,
  `DistributedLock` defines lock ownership and retry semantics,
  `LazyRefreshCache` defines stale-while-refresh behavior,
  `StampedeCache` defines lock-assisted regeneration behavior.
- Be careful with stored value shape changes. This package currently relies on
  Upstash's native value handling rather than a custom serializer layer, and
  `LazyRefreshCache` persists a structured payload containing `value`,
  `expiresAt`, and `softExpiresAt`. Changing those shapes is a compatibility
  change for existing keys.
- Keep key prefixing and cache key composition local to each strategy. This
  package should not absorb app-level namespacing or tenancy policy.
- `src/client.ts` is the exported Redis singleton boundary. If internal
  strategy code changes how it constructs clients, keep env parsing and public
  package behavior consistent.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient cache contents, Redis snapshots, or ad hoc key
  dumps and treat them as source.
- If build output is introduced later, update the source files above rather
  than patching derived artifacts.

## Validation

- Cache contract changes:
  `pnpm --filter @nebutra/cache typecheck`
- Because the package currently has no package-local tests, verify the narrowest
  downstream consumer that exercises the changed strategy or Redis env path
  before widening the change.
