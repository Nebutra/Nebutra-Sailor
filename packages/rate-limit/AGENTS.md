# AGENTS.md — packages/rate-limit

Execution contract for Nebutra's token-bucket rate limiting package.

## Scope

Applies to everything under `packages/rate-limit/`.

This package owns shared token-bucket types, plan presets, API weight mapping,
key namespacing, in-memory and Redis-backed limiter implementations, and the
small singleton cache for per-plan limiters. It is a shared control primitive,
not an app-local abuse policy engine.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical limiter contracts, presets, key prefixing, and runtime behavior:
  `src/tokenBucket.ts`
- Package-local contract coverage: `src/__tests__/tokenBucket.test.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `TokenBucketConfig`, `RateLimitResult`, `PLAN_LIMITS`, and
  `API_WEIGHTS` as the canonical contract surface. Changes to preset values,
  weight defaults, or result semantics affect downstream throttling behavior.
- Preserve namespacing through `buildKey()`. All stored keys are expected to
  carry the `sailor:rate-limit` prefix; do not scatter prefix logic across
  callers.
- Keep the distinction between process-local and distributed limiters:
  `TokenBucket` is in-memory and process-scoped,
  `RedisTokenBucket` is the distributed storage-backed implementation.
  Do not quietly blur one into the other.
- Keep provider selection outside this package. `createRedisRateLimiter()`
  accepts a minimal Redis-like interface and should not absorb cache client env
  resolution or app-specific retry policy.
- Preserve singleton behavior in `getRateLimiter()`. It is a per-plan cache for
  in-memory limiters, not a general registry for arbitrary tenancy or endpoint
  state.
- Treat the cleanup interval as runtime behavior, not a consumer concern. If
  memory lifecycle semantics change, update package-local tests in the same
  change.

## Generated And Derived Files

- `coverage/` and `tsconfig.tsbuildinfo` are derived artifacts. Do not edit
  them by hand.
- This package currently exports source directly and has no checked-in
  generated source of truth.
- If build output is introduced later, update the source files above rather
  than patching derived artifacts.

## Validation

- Rate-limit behavior, presets, or key semantics changes:
  `pnpm --filter @nebutra/rate-limit test`
- Export or type-surface changes:
  `pnpm --filter @nebutra/rate-limit typecheck`
