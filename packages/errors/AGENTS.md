# AGENTS.md — packages/errors

Execution contract for Nebutra's shared error semantics package.

## Scope

Applies to everything under `packages/errors/`.

This package owns canonical application error codes, typed error classes,
API-safe serialization helpers, and the framework-agnostic error middleware
shape. It is the shared error vocabulary layer, not the place for service-local
logging policy or provider-specific exception translation.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical error code catalog: `ERROR_CODES`
- Base error class and serialization behavior: `AppError`, `AppErrorOptions`,
  `AppError.toJSON()`
- Specific error subclasses and their default status semantics:
  `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ConflictError`, `RateLimitError`, `QuotaExceededError`,
  `ExternalServiceError`, `DatabaseError`
- API response and status helpers: `toApiError`, `getStatusCode`
- Framework boundary for request-safe error responses: `errorHandler`
- Assertion and wrapper helpers: `tryCatch`, `assert`, `assertFound`

Treat `README.md` as descriptive only. If docs drift, update `src/index.ts`
instead of preserving outdated examples.

## Contract Boundaries

- Keep `ERROR_CODES` as the canonical shared vocabulary. Additive changes are
  safest; renames or removals are compatibility changes for callers, handlers,
  and logs.
- Treat `AppError` and `ApiErrorResponse` as the stable serialization boundary.
  Do not leak raw unknown errors or provider-specific details through
  `toApiError`.
- Preserve default status-code mapping in `getDefaultStatusCode()` unless the
  compatibility change is deliberate and coordinated with consumers.
- Keep `errorHandler()` framework-agnostic and request-safe. Its job is to map
  errors into structured JSON and invoke the optional `onError` callback, not
  to own logging destinations or transport-specific side effects.
- Preserve the distinction between operational and non-operational errors.
  `DatabaseError` and other server faults should not be quietly normalized into
  benign client semantics.
- Keep assertion helpers thin wrappers over the shared error types. Do not
  embed app-specific policy or database lookups here.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in
  generated source of truth.
- Do not hand-edit future build output, coverage artifacts, or transient
  TypeScript output.
- If packaging changes later, update the source files above rather than derived
  artifacts.

## Validation

- Error type, code, or middleware changes:
  `pnpm --filter @nebutra/errors exec tsc --noEmit`
- Because this package currently has no package-local tests, verify the
  narrowest downstream consumer that exercises the changed error contract when
  behavior changes are non-trivial.
