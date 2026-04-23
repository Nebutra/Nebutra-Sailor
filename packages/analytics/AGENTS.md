# AGENTS.md — packages/analytics

Execution contract for Nebutra's analytics package.

## Scope

Applies to everything under `packages/analytics/`.

This package owns analytics contracts and transport helpers. It currently has
two distinct surfaces:

- legacy Dub-based attribution and link analytics
- typed product analytics and event transport for PostHog and Umami

Do not merge those surfaces casually or assume they share the same event model.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Legacy attribution and link analytics types: `src/types.ts`, `src/client.ts`
- Typed product event schemas and event-name contract: `src/events.ts`
- Product analytics transport and provider behavior: `src/track.ts`,
  `src/posthog.tsx`, `src/umami-proxy.ts`
- React-facing analytics context and browser UX: `src/react.tsx`
- Package-local runtime coverage:
  `src/__tests__/events.test.ts`,
  `src/__tests__/track.test.ts`,
  `src/__tests__/umami-proxy.test.ts`

If event names, provider behavior, or export surfaces change, update the source
of truth here and the narrowest relevant tests in the same work.

## Contract Boundaries

- Keep `src/events.ts` as the canonical typed event contract for product
  analytics. Add new events there; do not invent ad hoc payload shapes in app
  code.
- Preserve the distinction between the legacy Dub surface and the newer typed
  product-analytics surface. `src/types.ts` and `src/client.ts` are not the
  source of truth for typed PostHog or Umami events.
- Keep provider-specific transport logic in transport modules:
  `src/track.ts` for generic typed product tracking,
  `src/posthog.tsx` for PostHog browser integration,
  `src/umami-proxy.ts` for server-side Umami forwarding.
  Do not leak provider request details into event schemas.
- React/browser behavior belongs in `src/react.tsx` and `src/posthog.tsx`.
  Server-safe code should stay free of browser-only globals unless explicitly
  isolated behind client modules.
- Event contracts are compatibility-sensitive. Existing event names, field
  names, and enum values should be treated as locked unless you intentionally
  version the behavior and update consumers.
- Privacy and consent behavior are part of the package contract. Changes to
  tracking defaults, consent gating, or proxy forwarding semantics should be
  treated as product-policy changes, not harmless refactors.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Coverage output, Vitest artifacts, and temporary local analytics payloads are
  derived files.
- If built output needs to change, update the source files above and rerun the
  relevant build or tests.

## Validation

- Analytics runtime, event, or proxy behavior changes:
  `pnpm --filter @nebutra/analytics test`
- Export or type-surface changes:
  `pnpm --filter @nebutra/analytics typecheck`
- Prefer the narrowest relevant package tests:
  `src/__tests__/events.test.ts`,
  `src/__tests__/track.test.ts`,
  `src/__tests__/umami-proxy.test.ts`
