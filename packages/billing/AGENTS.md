# AGENTS.md — packages/billing

Execution contract for Nebutra's billing and monetization package.

## Scope

Applies to everything under `packages/billing/`.

This package owns provider-agnostic checkout resolution, payment-provider
clients, subscriptions, credits, usage accounting, and entitlement helpers. Do
not treat it as a generic app-level pricing UI layer.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical billing domain types, schemas, defaults, and error classes:
  `src/types.ts`
- Checkout provider detection and factory resolution:
  `src/checkout/factory.ts`, `src/checkout/types.ts`
- Provider-specific checkout behavior and webhook handling:
  `src/checkout/*.ts`, `src/stripe/`, `src/polar/`, `src/lemonsqueezy/`,
  `src/chinapay/`
- Credits balance and transaction semantics: `src/credits/service.ts`
- Usage ingestion, buffering, and metering bridge:
  `src/usage/service.ts`, `src/usage/ledger.ts`
- Entitlement and plan-level usage gating:
  `src/entitlements/service.ts`, `src/config/plan-config.ts`
- Package-local contract coverage:
  `src/__tests__/metering-integration.test.ts`,
  `src/checkout/__tests__/*.test.ts`

If provider behavior, credit semantics, usage semantics, or public exports
change, keep the affected source and the narrowest relevant tests aligned in
the same change.

## Contract Boundaries

- Keep provider selection centralized in `src/checkout/factory.ts`. Do not
  scatter `BILLING_PROVIDER` parsing or payment credential auto-detection across
  apps.
- Preserve the split between checkout orchestration and provider clients:
  checkout helpers choose and normalize behavior, while Stripe, Polar,
  LemonSqueezy, and ChinaPay integrations own provider-specific request and
  webhook details.
- Treat `src/types.ts` as the canonical billing contract. If plan, pricing,
  usage, subscription, or error semantics change, align exports and tests in
  the same work.
- Credits, usage, and entitlements are related but not interchangeable:
  credits represent spendable balance, usage represents metered consumption, and
  entitlements represent access policy. Do not collapse them into one helper or
  duplicate quota logic across services.
- Preserve the current migration reality in `src/entitlements/service.ts` and
  `src/usage/service.ts`. Some legacy DB-backed paths are intentionally
  deprecated or compatibility-only; do not silently reintroduce direct caller
  dependence on deprecated no-op APIs.
- Tenant-scoped billing data must stay tenant-scoped. When changing credits or
  subscription code that touches `@nebutra/db`, preserve the intended
  `getTenantDb()` access pattern and cache invalidation behavior.
- Keep package exports intentional. Subpath exports such as
  `@nebutra/billing/checkout`, `@nebutra/billing/credits`, and
  `@nebutra/billing/entitlements` are part of the contract; do not change them
  casually.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Coverage output, Vitest artifacts, and temporary local checkout payloads are
  derived files.
- If generated output or published types need to change, edit the source files
  above and rerun the producing build or tests.

## Validation

- Billing runtime, checkout, or metering behavior changes:
  `pnpm --filter @nebutra/billing test`
- Export or type-surface changes:
  `pnpm --filter @nebutra/billing typecheck`
- If provider resolution or checkout semantics change, prefer the narrowest
  relevant test under `src/checkout/__tests__/`.
- If usage or metering bridge semantics change, prefer the narrowest relevant
  test under `src/__tests__/metering-integration.test.ts`.
