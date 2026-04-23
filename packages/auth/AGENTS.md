# AGENTS.md — packages/auth

Execution contract for Nebutra's provider-agnostic auth package.

## Scope

Applies to everything under `packages/auth/`.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical auth contracts and normalized domain types: `src/types.ts`
- Server-side provider selection and lazy loading: `src/server.ts`
- Middleware factory and framework boundary: `src/middleware.ts`
- Client-facing hooks and React provider surface: `src/client.ts`,
  `src/react/index.ts`, `src/react/context.tsx`, `src/react/hooks.tsx`,
  `src/react/auth-provider.tsx`
- Provider adapters and provider-specific semantics:
  `src/providers/better-auth.ts`, `src/providers/clerk.ts`,
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
- Treat Better Auth and Clerk differently on purpose. Better Auth is the
  self-hosted implementation path in this package; Clerk is a bridge that
  points consumers to Clerk-native APIs. Do not move Clerk SDK ownership into
  this package or pretend the Clerk adapter is a full drop-in server runtime.
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
