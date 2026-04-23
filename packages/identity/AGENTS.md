# AGENTS.md — packages/identity

Execution contract for Nebutra's canonical identity adapter layer.

## Scope

Applies to everything under `packages/identity/`.

This package owns provider-to-canonical identity mapping. It does not own app
session management, auth middleware, or provider SDK orchestration.

## Source Of Truth

- Public package surface and adapter exports: `package.json`, `src/index.ts`
- Canonical adapter and registry contracts: `src/types.ts`
- Default adapter registration and provider availability:
  `src/registry.ts`
- Provider-specific canonical mapping rules:
  `src/adapters/clerk.ts`, `src/adapters/authjs.ts`,
  `src/adapters/nebutra.ts`

If canonical identity shape or provider mapping semantics change, update the
source of truth here instead of patching consumers.

## Contract Boundaries

- Keep `src/types.ts` as the canonical contract. `IdentityAdapter`,
  `IdentityProvider`, and `IdentityAdapterRegistry` define the package boundary;
  app code should consume those abstractions rather than reaching into adapter
  internals.
- This package maps provider payloads into `CanonicalIdentity` from
  `@nebutra/contracts`. Do not fork that schema in apps or add provider-local
  fields to the returned shape without changing the contract intentionally.
- Keep provider-specific validation and normalization inside the adapter files.
  `clerk`, `authjs`, and `nebutra` claim parsing should not be duplicated in
  callers.
- Preserve the difference between auth and identity. Authentication state,
  middleware, and runtime provider bootstrapping belong in `@nebutra/auth` or
  app code; this package should stay focused on canonical identity mapping and
  registry selection.
- Keep registry composition centralized in `src/registry.ts`. If the default
  provider set changes, update the registry factory instead of scattering
  manual registration across consumers.
- Changes here are contract-sensitive even if the package is small. A bad role,
  plan, or organization mapping silently breaks downstream authorization, so
  treat adapter changes as high-risk.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Temporary TypeScript build artifacts and ad hoc local adapter experiments are
  derived files.
- If exported build output needs to change, edit the source files above and
  rebuild.

## Validation

- Export or adapter-surface changes:
  `pnpm --filter @nebutra/identity typecheck`
- When changing canonical mapping semantics, verify the affected adapter
  against the relevant `CanonicalIdentity` contract in `@nebutra/contracts`
  before widening the change.
