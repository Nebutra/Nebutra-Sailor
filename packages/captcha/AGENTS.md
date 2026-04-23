# AGENTS.md — packages/captcha

Execution contract for Nebutra's CAPTCHA integration package.

## Scope

Applies to everything under `packages/captcha/`.

This package owns shared CAPTCHA React widgets, server-side token verification,
and Hono middleware wiring. It is a provider integration layer, not the place
for app-specific anti-abuse policy or product-side onboarding flows.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- React export surface:
  `src/react/index.ts`, `src/react/Turnstile.tsx`
- Server export surface and shared verification contract:
  `src/server/index.ts`, `src/server/turnstile.ts`
- Hono middleware behavior:
  `src/server/middleware.ts`

## Contract Boundaries

- Keep the runtime split explicit:
  `src/react/*` is the browser widget boundary,
  `src/server/*` is the verification and middleware boundary.
- Keep Turnstile verification semantics centralized in
  `src/server/turnstile.ts`. Secret-key env lookup, remote verification, and
  error-code mapping should not be duplicated in consuming apps.
- Keep `src/server/middleware.ts` focused on token extraction, verification,
  and request-context attachment. Route-specific abuse policy belongs outside
  this package.
- Preserve `package.json` subpath exports as the contract for consumers:
  `@nebutra/captcha`,
  `@nebutra/captcha/react`,
  `@nebutra/captcha/server`.
- Respect the current `wip` status in `package.json`. Alternate providers and
  finalized server hooks are not complete; do not imply broader provider
  coverage than the code currently ships.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient widget output, remote verification samples, or ad
  hoc generated assets.
- If the public surface changes, update `package.json` and the source files
  above instead of patching derived output.

## Validation

- This package currently has no package-local validation script.
- CAPTCHA contract changes should be validated in the narrowest affected
  downstream consumer because the package does not yet ship its own test or
  typecheck command.
