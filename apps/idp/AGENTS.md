# AGENTS.md — apps/idp

Scoped execution contract for the Nebutra identity provider app.

## Scope

This app owns the Next.js surface that hosts the Nebutra OIDC and OAuth-facing
identity provider experience.

It owns:

- the app shell under `src/app`
- app-local OIDC wiring in `src/lib/oidc.ts`
- app-local styling and landing surface for discovery and identity endpoints

It does not own the canonical OAuth provider implementation in
`@nebutra/oauth-server`, database contracts in `@nebutra/db`, or shared auth
schemas from workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `src/lib/oidc.ts` for provider wiring and app-local OIDC behavior
- `src/app/` for the UI shell, route composition, and endpoint-adjacent pages
- `next.config.ts` for app runtime configuration

Do not treat `.next/` output as implementation truth.

## Contract Boundaries

- Keep protocol semantics and shared provider behavior in `@nebutra/oauth-server`
  unless the change is explicitly app-local.
- Keep database access and persistence rules aligned with `@nebutra/db`; do not
  recreate auth storage contracts inside this app.
- `src/app/page.tsx` is only the operator-facing landing surface; discovery and
  provider behavior should remain driven by the OIDC wiring layer.
- Avoid introducing parallel auth or token semantics here when the package-level
  contract already exists elsewhere in the repo.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`

If the app behavior changes because provider wiring changed, update the checked-in
source under `src/lib/` or the owning workspace package rather than editing
build output.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/idp typecheck`
- `pnpm --filter @nebutra/idp build`
