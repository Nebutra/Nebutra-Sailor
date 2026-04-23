# AGENTS.md — packages/permissions

Execution contract for Nebutra's authorization package.

## Scope

Applies to everything under `packages/permissions/`.

This package owns shared permission types, default role definitions, provider
selection, React helpers, and Hono middleware for authorization checks. It is a
policy-evaluation layer, not the place for app-specific RBAC wiring or product
entitlement logic.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical permission types and error semantics: `src/types.ts`
- Default roles and hierarchy: `src/roles.ts`
- Provider selection and singleton lifecycle: `src/factory.ts`
- Hono authorization middleware contract: `src/middleware.ts`
- React permission context and helpers: `src/react.tsx`
- Provider implementations:
  `src/providers/casl.ts`, `src/providers/openfga.ts`

## Contract Boundaries

- Keep `src/types.ts` as the canonical permission contract. `Action`,
  `Resource`, `Role`, `PermissionContext`, `PermissionRule`, and
  `PermissionProvider` define the shared API.
- Keep provider selection in `src/factory.ts`. Do not scatter
  `PERMISSIONS_PROVIDER` or `OPENFGA_API_URL` detection into consumers.
- Preserve the runtime split:
  `src/middleware.ts` is the Hono server boundary,
  `src/react.tsx` is the React consumer boundary,
  providers stay behind the shared `PermissionProvider` interface.
- Treat `src/roles.ts` as the default role catalog. App-specific roles can be
  injected, but the shared hierarchy logic should not be redefined elsewhere.
- Respect the package's current foundation status. `src/providers/openfga.ts`
  is not feature-complete; do not write contracts or app integrations that
  assume full Zanzibar semantics already exist.
- Keep authorization policy separate from billing, feature gating, or tenant
  resolution. This package answers permission questions; it should not become a
  generic product-policy registry.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient build artifacts or ad hoc provider snapshots.
- If the export surface changes, update `package.json` and the source files
  above instead of patching derived output.

## Validation

- Package contract changes:
  `pnpm --filter @nebutra/permissions typecheck`
- Because the package currently has no package-local test suite, verify the
  narrowest affected downstream consumer when changing provider semantics or
  middleware behavior.

