# AGENTS.md — packages/supabase

Execution contract for Nebutra's Supabase integration package.

## Scope

Applies to everything under `packages/supabase/`.

This package owns shared Supabase client creation, server utilities, realtime
helpers, and storage helpers. It is a provider integration layer, not the place
for app-specific table schemas, business workflows, or custom access policy.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Browser, server, and tenant-scoped client creation:
  `src/client.ts`
- Server-side helpers and admin operations:
  `src/server.ts`
- Realtime subscription and broadcast helpers:
  `src/realtime.ts`
- Storage helper contract:
  `src/storage.ts`

## Contract Boundaries

- Keep `src/client.ts` as the canonical source for Supabase client creation.
  Env lookup, singleton behavior, and the anon-key vs service-role split belong
  here, not in consuming apps.
- Preserve the privilege boundary:
  `getSupabaseClient()` is the browser/anon path,
  `getSupabaseServer()` is the privileged server path,
  `getSupabaseTenant()` is the tenant-scoped server helper.
- Keep `src/server.ts` focused on shared server operations such as tenant
  context RPCs, function invocation, and health checks. App-specific SQL or
  workflow logic should stay outside this package.
- Keep realtime semantics in `src/realtime.ts` and storage semantics in
  `src/storage.ts`. Do not mix these transport surfaces into a generic service
  layer with app-specific defaults.
- Because service-role helpers bypass normal browser RLS expectations, changes
  here are security-sensitive. Prefer additive helpers over changing existing
  privilege semantics.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient Supabase payload dumps or ad hoc generated client
  artifacts.
- If the public surface changes, update `package.json` and the source files
  above instead of patching derived output.

## Validation

- Package contract changes:
  `pnpm --filter @nebutra/supabase typecheck`

