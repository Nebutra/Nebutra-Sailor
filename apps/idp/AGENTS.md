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

## Out Of Scope (Complexity Cap)

This app and `@nebutra/oauth-server` exist to serve the **internal needs** of
`apps/sleptons`, `apps/web`, and `apps/landing-page` — not to compete with
Auth0 / Ory Hydra / Authentik. Building an OIDC-Certified server is an
explicit non-goal: it's a 6+ engineer-year effort with no product return at
the current stage.

The following are **out of scope** until a real customer requirement says
otherwise (and is documented in a follow-up ADR):

- **OIDC certification suite** — we implement the subset our own apps use, not
  the full spec
- **Dynamic client registration** (`/register` endpoint) — clients are
  configured statically in code/env
- **External / third-party clients** — only Sailor-internal apps may register
  as relying parties
- **Grant types beyond `authorization_code` + `refresh_token`** — no
  `client_credentials`, no `device_code`, no `password`, no `implicit`
- **Custom scope vocabulary** — the scope list is frozen at what
  `apps/sleptons` and `apps/web` currently consume
- **JWT signing algorithms beyond RS256** — no ES256, no EdDSA, no HS\*
- **Federated / social login flows inside this app** — those live in
  `@nebutra/auth` (Better Auth providers), not here
- **Session management UI for end users** — managed in the consuming app, not
  in `idp`
- **Admin UI for managing clients, scopes, or users** — clients are code,
  users live in the consuming app's database

If a feature request lands that touches any of the above, the reviewer
**must** require either:

1. A linked ADR explaining the customer-facing reason, **or**
2. A redirect to use Clerk / Auth0 / Better Auth's hosted equivalent
   instead.

Rationale: `apps/idp` is a **leverage** app — its value comes from doing
just enough auth so that Sailor doesn't need a third-party auth vendor for
internal flows. Every feature added beyond the minimum dilutes that
leverage and grows a maintenance surface that competes with the
core product.

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
