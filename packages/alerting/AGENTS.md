# AGENTS.md — packages/alerting

Execution contract for Nebutra's shared service alerting package.

## Scope

Applies to everything under `packages/alerting/`.

This package owns the alert payload contract, channel registry, built-in webhook
channel factories, broadcast helpers, and the in-memory error-rate tracking
utility. It is a low-level alert dispatch package, not a place for app-specific
incident policy, escalation routing, or durable event history.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical alert payload, severity vocabulary, and channel interface:
  `src/index.ts`
- Channel registry lifecycle and dispatch helpers:
  `registerChannel`, `unregisterChannel`, `sendAlert`, `sendAlertTo`
- Built-in provider adapters:
  `createSlackChannel`, `createDiscordChannel`, `createWebhookChannel`
- Internal failure reporting hook:
  `setAlertErrorHandler`
- In-memory error-rate windowing and cooldown semantics:
  `trackError`, `resetErrorCounts`
- Package-local contract coverage: `src/__tests__/alerting.test.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep package exports aligned with `src/index.ts`. Consumers should not
  deep-import internal helpers from ad hoc files.
- Treat `AlertPayload`, `AlertSeverity`, and `AlertChannel` as the canonical
  compatibility surface. Field renames, payload shape changes, or altered send
  semantics are downstream contract changes.
- Preserve the registry boundary in this package. Channel registration,
  deregistration, and fan-out dispatch live here; app-specific routing and
  escalation policy belong outside this package.
- Keep provider-specific request shaping inside the built-in channel factories.
  Do not scatter Slack, Discord, or custom webhook payload transforms across
  callers.
- `setAlertErrorHandler` is the only supported way to observe internal dispatch
  failures. Do not reintroduce implicit console or stderr side effects.
- `trackError` is intentionally in-memory and process-local. Do not treat it as
  durable rate monitoring or cross-instance incident aggregation without adding
  a real persistence boundary first.
- Helpers like `alertInfo`, `alertWarning`, `alertError`, and `alertCritical`
  are convenience wrappers over `sendAlert`; keep their semantics thin and
  aligned with the base payload contract.

## Generated And Derived Files

- `coverage/` is derived test output. Do not edit it by hand.
- This package currently exports source directly and has no checked-in
  generated source of truth.
- If build output is introduced later, update the source files above rather
  than patching derived artifacts.

## Validation

- Alert contract or dispatch changes:
  `pnpm --filter @nebutra/alerting exec tsc --noEmit`
- Registry, provider, or error-rate behavior changes:
  `pnpm --filter @nebutra/alerting test`
