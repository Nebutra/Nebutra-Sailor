# AGENTS.md — packages/license

Execution contract for Nebutra's license domain package.

## Scope

Applies to everything under `packages/license/`.

This package owns license issuance, validation, queue event payloads, and
license-side effect handlers. It is the canonical license domain layer, not the
place for app-local purchase flows or UI-only entitlement checks.

## Source Of Truth

- Public package surface and subpath exports:
  `package.json`,
  `src/index.ts`,
  `src/handlers/index.ts`
- Canonical schemas and domain types:
  `src/types.ts`
- License issuance semantics and queue dispatch:
  `src/issue-license.ts`
- License validation semantics:
  `src/validate-license.ts`
- Handler-side downstream effects for issued licenses:
  `src/handlers/on-license-issued.ts`
- Package-local tests:
  `src/__tests__/`

If license type semantics, queue payload shape, or handler side effects change,
update the source of truth here rather than patching consumers.

## Contract Boundaries

- Keep `src/types.ts` as the canonical license contract. `LicenseTier`,
  `LicenseType`, `IssueLicenseParams`, `IssueLicenseResult`, and
  `LicenseIssuedEvent` define the package boundary.
- Preserve issuance logic inside `src/issue-license.ts`. Idempotency, paid-vs-
  free mapping, expiration rules, and queue enqueue behavior are core domain
  semantics and should not be reimplemented elsewhere.
- Keep validation semantics centralized in `src/validate-license.ts`. Callers
  should not duplicate global-key lookups or expiry rules.
- Treat `src/handlers/on-license-issued.ts` as the package-owned integration
  point for post-issuance side effects. If downstream profile creation or email
  behavior changes, update the handler here rather than scattering callbacks in
  app code.
- Preserve the separation between domain logic and transport. This package owns
  license decisions and event payloads; purchase checkout UX and external sales
  flows belong in billing/app surfaces.
- `./handlers` is a public subpath export. Changes there are compatibility-
  sensitive even if the root package API remains unchanged.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Coverage output and transient license-event payloads are derived artifacts,
  not maintenance surfaces.
- If generated output is introduced later, update the source files above rather
  than patching derived artifacts.

## Validation

- License domain changes:
  `pnpm --filter @nebutra/license test`
- Public type or export changes:
  `pnpm --filter @nebutra/license typecheck`
