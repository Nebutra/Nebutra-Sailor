# Tech-debt hygiene baselines (2026-07-24)

Closed under epic #227 workstreams #232 / #233.

## Console in production paths (#233)

| Category | Policy |
|----------|--------|
| `@nebutra/logger` / package loggers | Required for intentional server logging |
| `packages/ops/cli` | **Exempt** — CLI stdout is the product UX (`console.log` is intentional) |
| Scaffold seed templates (`create-sailor` emitted strings) | **Exempt** — seed scripts run in user terminals |
| JSDoc / Storybook / marketing code samples | **Exempt** — illustrative only |
| Client `debug` analytics probes | **Allowed** only behind an explicit `debug` flag |
| Dead `console.*` in apps/packages runtime | **Banned** — delete or replace with logger |

Inventory after this closure: no remaining non-exempt production `console.log/debug/info`
outside CLI, scaffolds, samples, and debug-gated analytics.

## `as any` / `@ts-*` surface (#232)

| Policy | Detail |
|--------|--------|
| CLI residual | **Closed** — `admin` / `link` / `community` / `upgrade` typed; no bare `as any` in CLI command modules |
| Generated Prisma client | **Exempt** — vendor-generated; do not hand-edit |
| Remaining hotspots | Prefer Zod parse / generics on touch; shrink-only |

Architecture test: `tests/architecture/type-hygiene-ratchet.test.ts` fails if the
non-generated `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` count
rises above the recorded baseline.
