# AGENTS.md — packages/auth

Execution contract for Nebutra's provider-agnostic auth package.

## Scope

Applies to everything under `packages/iam/auth/`.

## Single provider (product model)

Per ADR 2026-09-24 (Sailor Convergence), Better Auth is the only kept auth
provider — the Clerk, NextAuth (Auth.js), and Supabase adapters have been
deleted, not demoted. `AuthProviderId` is `"better-auth" | "dev"`
(`src/types.ts`). Product code still has **one import surface**:
`@nebutra/auth` (and `/react`, `/client`, `/middleware`). Apps must not import
`better-auth` directly outside allowlisted adapter paths (architecture test +
allowlist for known exceptions).

`apps/sleptons` is the one exception, and it does not go through this
package: it is Nebutra's own product, stripped from the template, and keeps a
direct `@clerk/nextjs` integration on purpose.

Two capability layers must both pass before UI exposes a feature:

1. **Declared matrix** — `src/provider-matrix.ts` (`AUTH_PROVIDER_MATRIX`, tiers)
2. **Runtime probe** — `AuthProvider.capabilities` (plugins actually mounted)

AND them with `isCapabilityEffective(provider, feature, runtimeCaps)`.

Tiers: `first-class` (better-auth default) · `dev-only` (dev, synthetic local
sessions).

Impersonation is **declared false** for all providers until an adapter
implements it end-to-end — no half-cookie product path.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical auth contracts and normalized domain types: `src/types.ts`
- Static multi-provider matrix: `src/provider-matrix.ts`
- Server-side provider selection and lazy loading: `src/server.ts`
- Middleware factory and framework boundary: `src/middleware.ts`
- Client-facing hooks and React provider surface: `src/client.ts`,
  `src/react/index.ts`, `src/react/context.tsx`, `src/react/hooks.tsx`,
  `src/react/auth-provider.tsx`
- Provider adapters and provider-specific semantics:
  `src/providers/better-auth.ts`, `src/providers/dev.ts`,
  `src/react/providers/*.tsx`
- Service-to-service auth token helpers: `src/s2s.ts`
- Export-surface compile check: `test-exports.ts`

## Contract Boundaries

- Keep `src/types.ts` as the canonical auth contract. If session, user,
  organization, sign-in method, or provider interface semantics change, align
  exports and the narrowest validation in the same change.
- Preserve the runtime split across subpath exports:
  `@nebutra/auth` and `@nebutra/auth/server` are server-only factories,
  `@nebutra/auth/middleware` is the framework middleware boundary,
  `@nebutra/auth/client` and `@nebutra/auth/react` are client-only React
  surfaces, and `@nebutra/auth/components` is UI-only. Do not import server
  factories into client code or React hooks into middleware/server entrypoints.
- Keep provider selection centralized in `src/server.ts` and
  `src/middleware.ts`. Do not duplicate provider env parsing, dynamic imports,
  or adapter branching in consumers.
- Better Auth is the only production adapter this package implements (plus
  `dev` for local synthetic sessions). Do not reintroduce a Clerk, NextAuth, or
  Supabase adapter here — that surface was deleted per ADR 2026-09-24. A
  consumer that genuinely needs a different provider (e.g. `apps/sleptons`'s
  direct Clerk integration) integrates it directly, outside this package.
- Keep React normalization inside `src/react/`. Hooks and UI components should
  consume the shared auth context, not reach into provider modules directly.
  Provider-specific React wrappers belong under `src/react/providers/`.
- Preserve auth semantics over convenience. Changes that affect session
  resolution, organization context, middleware pass-through behavior, or S2S
  verification should be treated as security-sensitive and updated test-first
  when practical.
- Keep service-token signing and verification rules in `src/s2s.ts`. If header
  shape or verification semantics change, update all callers intentionally
  rather than shadowing the logic elsewhere.

## Generated And Derived Files

- This package has no checked-in generated source of truth today.
- Do not hand-edit derived output such as `dist/`, `coverage/`, or transient
  TypeScript/Vitest artifacts.
- If export shape changes, update the source files above rather than patching
  built output.

## Validation

- Export or type-surface changes: `pnpm --filter @nebutra/auth typecheck`
- Subpath export or packaging changes: ensure `test-exports.ts` still compiles
  under the package typecheck
- When auth semantics change, prefer the smallest meaningful test or consumer
  verification that exercises the affected runtime boundary before widening the
  change
