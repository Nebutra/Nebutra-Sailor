# AGENTS.md — packages/logger

Execution contract for Nebutra's structured logging and OTel package.

## Scope

Applies to everything under `packages/logger/`.

This package owns the shared logger interface, the Pino-backed runtime logger,
request-scoped child logger creation, and the optional OpenTelemetry bootstrap
and HTTP metric helpers. It is the observability primitive layer, not a place
for app-specific log routing or domain event modeling.

## Source Of Truth

- Public package surface and subpath exports:
  `package.json`, `src/index.ts`, `src/otel.ts`
- Canonical logger interface and metadata contract: `src/types.ts`
- Pino runtime configuration, redaction policy, trace correlation, and request
  logger semantics: `src/logger.ts`
- OTel initialization and metric helper semantics: `src/otel.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving outdated docs.

## Contract Boundaries

- Keep `Logger` and `Meta` in `src/types.ts` as the canonical compatibility
  contract. Downstream packages should code against these interfaces, not Pino
  internals.
- Preserve the export split:
  `@nebutra/logger` exposes the structured logger surface,
  `@nebutra/logger/otel` exposes telemetry bootstrap and counters.
  Do not force OTel consumers through the base logger entrypoint or vice versa.
- Keep Pino configuration and redaction policy centralized in `src/logger.ts`.
  Changes to `REDACTED_FIELDS`, default log levels, or dev/test behavior are
  cross-service observability changes and should be treated deliberately.
- Preserve automatic trace correlation via `getTraceId()` and request scoping
  via `withRequestId()`. Do not scatter trace lookup or request-id child logger
  construction across consumers.
- Keep OTel environment gating in `src/otel.ts`. `initOtel()` is intentionally
  a no-op unless `OTEL_ENABLED=true`; do not move that policy into callers.
- `recordHttpRequest()` and `recordHttpError()` are helper counters over the
  configured meter, not a replacement for full request middleware semantics.

## Generated And Derived Files

- `tsconfig.tsbuildinfo` is derived compiler output. Do not edit it by hand.
- This package currently exports source directly and has no checked-in
  generated source of truth.
- If build or telemetry-generated artifacts are introduced later, update the
  source files above rather than patching derived output.

## Validation

- Logger interface, redaction, or request-scope changes:
  `pnpm --filter @nebutra/logger typecheck`
- OTel bootstrap or metrics changes should also be verified in the narrowest
  downstream runtime that initializes telemetry, because this package currently
  has no package-local test suite.
