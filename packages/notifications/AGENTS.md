# AGENTS.md — packages/notifications

Execution contract for the notification runtime and provider adapters.

## Scope

Applies to everything under `packages/notifications/`.

## Source Of Truth

- Public package surface: `src/index.ts` and `package.json` exports
- Core provider and payload contracts: `src/types.ts`
- Notification catalog, channel metadata, and default preference seeds:
  `src/catalog.ts`, `src/defaults.ts`
- Provider selection, runtime capability detection, and settings snapshot
  shaping: `src/factory.ts`, `src/runtime.ts`, `src/settings.ts`
- Provider-specific behavior: `src/providers/direct.ts`, `src/providers/novu.ts`

## Contract Boundaries

- Keep this package provider-agnostic at the top level. App-specific delivery
  orchestration, UI wiring, and product workflows should stay outside it.
- Do not scatter provider auto-detection or env parsing across consumers. Keep
  runtime selection and capability rules in `src/factory.ts` and `src/runtime.ts`.
- Treat the types and Zod schemas in `src/types.ts` as the contract boundary. If
  payloads, preferences, or adapter interfaces change, update exports and tests
  in the same change.
- Treat the direct provider as an adapter shell. New email, push, SMS, chat, or
  inbox implementations should come in through the dispatcher and store
  interfaces, not through app-specific imports.
- Keep Novu mapping logic isolated to `src/providers/novu.ts`. If managed
  provider behavior changes, keep the runtime status and fallback semantics
  aligned.
- Keep settings read models in `src/settings.ts`. If catalog structure or
  runtime capability rules change, update the settings tests together.

## Generated And Derived Files

- This package has no checked-in generated source of truth today.
- Do not hand-edit derived output such as `dist/`, `coverage/`, or transient
  Vitest artifacts.
- If public exports change, update the source files above rather than editing
  generated build output.

## Validation

- Contract or runtime changes: `pnpm --filter @nebutra/notifications test`
- Export or type surface changes: `pnpm --filter @nebutra/notifications typecheck`
- Prefer the smallest meaningful test update under `src/__tests__` when
  changing provider selection, settings snapshots, or fallback behavior.
