# AGENTS.md — packages/oauth-server

Execution contract for Nebutra's OIDC provider engine.

## Scope

Applies to everything under `packages/oauth-server/`.

This package owns the reusable OAuth 2.0 / OpenID Connect server boundary for
Nebutra. It defines provider construction, supported scopes and claims, and the
storage adapter split between Prisma-backed client metadata and Redis-backed
ephemeral state.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- OIDC provider factory and runtime configuration:
  `src/provider.ts`
- Canonical Nebutra scopes, claims, and consent descriptions:
  `src/claims.ts`
- oidc-provider storage adapter behavior and persistence split:
  `src/adapters/prisma-adapter.ts`

If issuer behavior, scope semantics, or adapter persistence changes, update the
source of truth here rather than patching downstream apps.

## Contract Boundaries

- Keep `src/provider.ts` as the only place that assembles `oidc-provider`
  features, TTLs, interaction URLs, and `findAccount` claim mapping.
- Keep `src/claims.ts` as the canonical claim and scope contract. Do not
  scatter Nebutra-specific claim names or consent labels into consuming apps.
- Preserve the adapter split in `src/adapters/prisma-adapter.ts`:
  OAuth client registrations come from Prisma,
  ephemeral protocol state lives in Redis with TTL semantics.
- Treat `Client` records as externally managed metadata. This package should
  not grow app-specific client-registration workflows or write paths that
  bypass the existing read-only adapter contract.
- Changes to claims, token TTLs, or account lookup behavior are compatibility
  changes for integrators. Prefer additive scope work over renaming or
  repurposing existing claims.

## Generated And Derived Files

- `dist/` is derived build output.
- Do not hand-edit generated declaration or bundle artifacts.
- If the published surface changes, update `src/index.ts` and rebuild instead
  of patching `dist/`.

## Validation

- Package contract changes:
  `pnpm --filter @nebutra/oauth-server typecheck`
- Runtime adapter or provider changes:
  `pnpm --filter @nebutra/oauth-server test`

