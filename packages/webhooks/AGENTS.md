# AGENTS.md — packages/webhooks

Execution contract for Nebutra's outbound webhook delivery package.

## Scope

Applies to everything under `packages/webhooks/`.

This package owns webhook endpoint and message contracts, provider selection,
signature helpers, and the managed vs custom delivery adapters. It is the
shared outbound delivery layer, not an app-specific endpoint registry UI.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical endpoint, message, delivery-attempt, and provider contracts:
  `src/types.ts`
- Provider selection and singleton runtime: `src/factory.ts`
- Shared signature generation and verification helpers: `src/signing.ts`
- Managed provider adapter: `src/providers/svix.ts`
- Self-hosted delivery adapter, retry schedule, and in-memory endpoint/message
  state: `src/providers/custom.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `src/types.ts` as the canonical webhook contract. Tightening endpoint,
  message, or attempt shapes is a compatibility change for downstream services.
- Keep provider selection centralized in `src/factory.ts`. Do not duplicate
  environment detection or provider instantiation in consumers.
- Preserve the split between managed delivery and custom delivery:
  `src/providers/svix.ts` owns the Svix-backed path,
  `src/providers/custom.ts` owns the self-hosted path and its retry behavior.
- Keep shared signature format and verification in `src/signing.ts`. Do not
  scatter signing rules across providers or apps.
- Respect the package's current foundation status. Custom delivery currently
  lacks durable retry and dead-letter guarantees; do not document or code
  against stronger reliability than the package actually provides.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient delivery logs, retry snapshots, or future build
  output.
- If provider behavior changes, update the source files above rather than
  patching derived artifacts.

## Validation

- Type, signing, factory, or provider changes:
  `pnpm --filter @nebutra/webhooks typecheck`
- Export or build-output changes:
  `pnpm --filter @nebutra/webhooks build`
