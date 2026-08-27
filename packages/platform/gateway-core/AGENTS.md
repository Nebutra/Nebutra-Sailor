# AGENTS.md — packages/gateway-core

Scoped execution contract for `packages/gateway-core`.

## Scope

This package owns the reusable request-lifecycle logic that sits under the API
gateway:

- API key resolution and auth context creation
- rate-limit and balance pre-check middleware
- usage extraction and cost calculation helpers
- async completion-event enqueueing and worker-side billing closure

Do not treat this package as a generic place for route code, provider-specific
request shaping, or app-level policy decisions.

## Source Of Truth

When changing behavior here, edit the canonical source instead of patching a
consumer.

- Public package surface: `package.json`, `src/index.ts`
- Shared gateway types and event schema: `src/types.ts`
- Hot-path auth and guard semantics:
  - `src/middleware.ts`
  - `src/auth/api-key-resolver.ts`
  - `src/auth/balance-guard.ts`
- Metering and cost semantics:
  - `src/metering/usage-extractor.ts`
  - `src/metering/cost-calculator.ts`
  - `src/metering/tiktoken-fallback.ts`
- Async billing-closure flow:
  - `src/worker/completion-event.ts`
  - `src/worker/completion-worker.ts`

If request, billing, or metering behavior changes, keep exports and the narrow
package tests aligned in the same change.

## Contract Boundaries

- Preserve request lifecycle ordering in `src/middleware.ts`:
  1. request metadata
  2. API key validation
  3. rate limiting
  4. balance pre-check
  5. downstream handler
- Keep middleware dependency-injected. Do not introduce hidden global
  singletons for Redis, Prisma, billing, queue, or logger access.
- `api-key-resolver` owns token format, hashing, cache lookup, DB fallback, and
  revoked/expired checks. Do not duplicate that logic in middleware or apps.
- `balance-guard` owns the credit pre-check cache contract. Cache invalidation
  after billing events belongs to the worker closure path, not request
  handlers.
- Rate limiting, billing, and metering are separate concerns:
  - rate limiting decides whether the request may start
  - balance guard decides whether credits are sufficient before execution
  - worker closure records usage and deducts credits after completion
- Preserve idempotency on async completion processing. `requestId` is the
  authoritative dedupe key for queueing, request logs, metering, and billing
  closure.
- Non-critical closure steps such as cache invalidation and usage ingestion
  must stay best-effort. Do not make them able to crash or retry-storm the
  worker path.
- Provider-specific upstream formatting should stay outside this package unless
  the package explicitly becomes the canonical provider adapter boundary.

## Generated And Derived Files

Do not hand-edit derived output for this package.

- `coverage/`
- Vitest output and temporary artifacts
- any future build output under `dist/`

If a generated artifact needs to change, edit the source file and regenerate or
rerun the producing command.

## Validation

Run the smallest credible package-local validation for the behavior you touch.

- `pnpm --filter @nebutra/gateway-core test`
- `pnpm --filter @nebutra/gateway-core typecheck`

Prefer the narrowest relevant test scope when possible:

- middleware lifecycle: `src/__tests__/middleware.test.ts`
- API key and balance guards: `src/auth/__tests__/*.test.ts`
- worker closure and enqueueing: `src/worker/__tests__/*.test.ts`
- package export behavior: `src/index.test.ts`
