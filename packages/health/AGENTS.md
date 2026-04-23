# AGENTS.md — packages/health

Execution contract for Nebutra's health probe package.

## Scope

Applies to everything under `packages/health/`.

This package owns shared health-check result types, the process-local checker
registry, built-in dependency probe factories, and simple readiness/liveness
endpoint helpers. It is a health aggregation layer, not a service discovery
system or app-specific monitoring dashboard.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical result and checker contracts:
  `HealthCheckResult`, `HealthChecker`
- Process-local checker registry: `registerHealthCheck`
- Built-in dependency probe factories:
  `createDatabaseCheck`, `createRedisCheck`, `createHttpCheck`,
  `createMemoryCheck`
- Overall aggregation semantics: `runHealthChecks`
- HTTP endpoint helpers:
  `healthEndpoint`, `livenessEndpoint`, `readinessEndpoint`

Treat `README.md` as descriptive only. If examples drift, update `src/index.ts`
instead of preserving stale docs.

## Contract Boundaries

- Keep `HealthCheckResult` and `HealthChecker` as the canonical package
  contract. If result shape or pass/warn/fail semantics change, update
  downstream consumers deliberately.
- Preserve the distinction between the global registry and ad hoc checkers.
  `registerHealthCheck()` mutates process-local state; `runHealthChecks()`
  merges that state with explicitly passed checkers. Do not blur the two.
- Keep built-in probes narrowly scoped:
  database probes only test query reachability,
  Redis probes only test ping semantics,
  HTTP probes only test endpoint reachability and expected status,
  memory probes only inspect local process usage.
- Preserve overall status aggregation:
  any `fail` yields `unhealthy`,
  any `warn` without failures yields `degraded`,
  otherwise the result is `healthy`.
- Keep HTTP endpoint semantics stable:
  `healthEndpoint()` returns `200` for healthy and degraded states, `503` for
  unhealthy;
  `readinessEndpoint()` returns readiness plus checks;
  `livenessEndpoint()` remains a cheap ping without dependency checks.

## Generated And Derived Files

- `tsconfig.tsbuildinfo` is derived compiler output. Do not edit it by hand.
- This package currently exports source directly and has no checked-in
  generated source of truth.
- If build output is introduced later, update the source files above rather
  than derived artifacts.

## Validation

- Health result, endpoint, or probe changes:
  `pnpm --filter @nebutra/health typecheck`
- Because this package currently has no package-local tests, verify the
  narrowest downstream consumer or route that exercises the changed health
  semantics when behavior changes are non-trivial.
