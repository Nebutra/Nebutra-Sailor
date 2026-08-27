# Real-user Core Web Vitals release gate — BLOCKED, not shipped

Date: 2026-07-26
Issue: G44 (real-user performance gate)
Status: **BLOCKED on a queryable data source.** No gate, no threshold, and no
placeholder route/workflow was created.

## What already exists

Real-user Core Web Vitals **are** being collected today, on both apps, via
Vercel Speed Insights:

| Surface | Evidence |
|---|---|
| Landing | `apps/landing/src/app/[lang]/layout.tsx:9` (`import { SpeedInsights } from "@vercel/speed-insights/next"`), rendered at `:229`; `@vercel/analytics/react` imported at `:8`, rendered at `:230` |
| Dashboard | `apps/web/src/app/layout.tsx:11` (same import), rendered at `:128` |

## Why a CI gate cannot be built on it

1. **The data is not queryable from CI.** Speed Insights aggregates are readable
   only in Vercel's dashboard UI. There is no first-party collector in this
   repo to read instead: a repo-wide grep across `apps/`, `packages/` and
   `backends/` for `onCLS`, `onLCP`, `onINP`, `useReportWebVitals` and
   `reportWebVitals` returns **zero** hits, and `find apps backends -path
   '*vitals*'` returns nothing — there is no `/api/vitals` ingestion endpoint.
   A GitHub Actions step therefore has nothing to assert against.

2. **Lab numbers are not field numbers.** The Core Web Vitals "good" cutoffs —
   LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 — are defined at the **p75 of real
   visits**. A single Lighthouse run on a GitHub-hosted runner produces one
   synthetic sample under unknown CPU contention; it cannot compute a
   percentile over a real user population. Asserting lab numbers as if they
   were field data would ship a confident-looking false signal, which is worse
   than no gate.

No RUM threshold is being invented against data we cannot read.

## What ships instead (this same change)

Continuous *lab* verification was widened rather than faked
(`lighthouserc.json`, locked by `tests/architecture/lighthouse-ci.test.ts`):

- URL coverage went from a single `http://localhost:3000` to four routes:
  `/`, `/pricing`, `/features`, `/zh-Hans`.
- `numberOfRuns` went from 1 to 3 — LHCI asserts the **median** run, so three
  runs materially reduces per-run noise.
- Assertion severities are unchanged and deliberately asymmetric:
  `categories:accessibility` ≥ 0.95 is `error` (blocks the PR, because
  rule-based a11y audits are reproducible on shared runners), while
  performance / best-practices / seo stay `warn` (scores swing with runner CPU
  contention, and a flaky blocking metric is worse than no metric).
- No per-metric LCP/CLS/TBT assertions were added, for the same reason.

## Unblocking path (future work — not started)

1. Add a first-party collector using the `web-vitals` library
   (`onLCP` / `onINP` / `onCLS`) that POSTs samples, with route + locale +
   device-class dimensions, to a gateway endpoint (`backends/gateway`).
2. Persist to a queryable store and materialise a **p75 per route per 28-day
   window** aggregate.
3. Only then add a release gate that reads that aggregate — comparing p75
   against the CWV cutoffs, on a rolling window, not per-PR.

Placement constraint for whoever picks this up: the collector must **not** be
added inside `apps/landing/src/app/**/layout.tsx` or `apps/landing/src/i18n/**`
— those paths are owned by the i18n/SEO workstream. Mount it from a client
component the marketing route group already renders, or from the gateway side.
