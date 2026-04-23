# AGENTS.md — packages/status

Execution contract for Nebutra's multi-provider status integration package.

## Scope

Applies to everything under `packages/status/`.

This package owns the provider-agnostic status data contract, provider factory,
provider adapters, public fetch facade, and React status UI components. It is a
shared status integration layer, not a monitoring backend or the place for
service-local health policy.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical provider-agnostic status types and config union: `src/types.ts`
- Provider interface and provider selection factory: `src/provider.ts`
- Public fetch facade and backwards-compatible entrypoint behavior: `src/api.ts`
- Shared fallback and overall-status aggregation helpers:
  `src/providers/shared.ts`
- Provider-specific fetch and transform semantics:
  `src/providers/openstatus.ts`,
  `src/providers/statuspage.ts`,
  `src/providers/internal.ts`
- React presentation surfaces:
  `src/components/status-badge.tsx`,
  `src/components/status-widget.tsx`

Treat `README.md` as descriptive only. If docs drift, update the source files
above instead of preserving outdated examples.

## Contract Boundaries

- Keep `StatusConfig`, `StatusPageData`, `StatusState`, and related types in
  `src/types.ts` as the canonical compatibility surface. Additive changes are
  safest; tightening or renaming fields is a downstream contract change.
- Preserve provider selection in `src/provider.ts`. Callers should not branch on
  concrete providers or instantiate provider classes directly unless they are
  intentionally extending the package boundary.
- Keep backwards-compatible defaults in `src/api.ts` and the React components:
  OpenStatus remains the default when `provider` is omitted and `pageSlug` is
  provided.
- Preserve the separation between data adapters and UI:
  provider implementations normalize remote payloads into `StatusPageData`,
  while `status-badge` and `status-widget` consume the normalized data or the
  public fetch facade. Do not couple components to provider-specific payload
  shapes.
- Keep fallback behavior centralized in the provider modules and
  `src/providers/shared.ts`. Unknown or failed upstream responses should
  continue to degrade to safe default status data rather than throwing raw
  transport errors into UI consumers.
- `src/providers/internal.ts` adapts an internal `/health` shape into the
  shared status model. Do not redefine health endpoint semantics inside status
  components or consumers.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in
  generated source of truth.
- Do not hand-edit future build output, story artifacts, or transient React
  build caches and treat them as source.
- If packaging changes later, update the source files above rather than derived
  artifacts.

## Validation

- Status type, provider, or export-surface changes:
  `pnpm --filter @nebutra/status exec tsc --noEmit`
- Because this package currently has no package-local tests, verify the
  narrowest downstream consumer that exercises the affected provider or React
  surface when behavior changes are non-trivial.
