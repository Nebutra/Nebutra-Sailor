# AGENTS.md — apps/sleptons

Scoped execution contract for the Sleptons community app.

## Scope

This app owns the Sleptons community-facing Next.js surface.

It owns:

- the app shell and route behavior under `src/app`
- app-local data loading under `src/lib`
- app-local presentation components under `src/components`
- app-local tests under `src/__tests__`

It does not own canonical member persistence, shared auth provider contracts, or
shared UI primitives from workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `src/app/` for route behavior and page composition
- `src/lib/members.ts` and `src/lib/constants.ts` for app-local data access and
  filtering semantics
- `src/components/` for app-specific UI behavior
- `src/__tests__/` for the existing contract coverage around members and
  onboarding UI

Do not treat `.next/` output as implementation truth.

## Contract Boundaries

- Keep Clerk provider setup in the app shell; do not spread auth bootstrapping
  ad hoc across unrelated components.
- Keep member query semantics centralized in `src/lib/members.ts` rather than
  duplicating filters in route components.
- Shared schema and persistence behavior belong in workspace packages such as
  `@nebutra/db`; this app should stay a consumer of those contracts.
- When UI behavior changes, keep the app-local tests aligned instead of relying
  on visual inspection alone.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`

If rendered behavior is wrong, update the checked-in app source or tests rather
than editing build output.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/sleptons typecheck`
- `pnpm --filter @nebutra/sleptons test`
- `pnpm --filter @nebutra/sleptons build`
