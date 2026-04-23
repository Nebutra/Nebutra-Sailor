# AGENTS.md — packages/sms

Execution contract for Nebutra's SMS verification package.

## Scope

Applies to everything under `packages/sms/`.

This package owns SMS provider adapters, the verification-code lifecycle, and
the Redis-backed cooldown/TTL flow used for phone verification. It is a shared
verification primitive, not the place for app-specific auth UX or phone-number
policy.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical provider and config contracts: `src/types.ts`
- Verification-code init, generation, cooldown, storage, and verification
  semantics: `src/verify.ts`
- Provider-specific API signing and transport behavior:
  `src/providers/aliyun.ts`, `src/providers/tencent.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `src/types.ts` as the canonical SMS contract. Tightening provider or
  config shapes is a compatibility change for downstream consumers.
- Keep verification lifecycle semantics centralized in `src/verify.ts`.
  Cooldown keys, TTL behavior, masking/logging, and cleanup should not be
  reimplemented in apps.
- Preserve the split between provider adapters and verification flow.
  Provider-specific request signing, env resolution, and transport calls belong
  in `src/providers/`; stateful verification logic belongs in `src/verify.ts`.
- Keep external state injected. `initSmsVerification` depends on a provider and
  Redis-like client supplied by callers; do not silently add hidden globals or
  app-specific cache lookups here.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient verification-code snapshots, provider response
  dumps, or future build output.
- If SMS behavior changes, update the source files above rather than patching
  derived artifacts.

## Validation

- SMS provider or verification-flow changes:
  `pnpm --filter @nebutra/sms typecheck`
