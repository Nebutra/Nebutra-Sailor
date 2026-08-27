# RFC B3/B4/B6: Route-Scoped Abuse Controls for Gateway Rate-Limit Bypasses

Status: Proposed
Date: 2026-06-08
Dimensions: B3 observability maturity, B4 security architecture, B6 test blind spots

## Delta Scope

This proposal covers a new gateway governance issue observed on `origin/main` after the 2026-06-02 baseline. The latest upstream gateway change keeps auth session and related routes outside the global API rate limiter, which is operationally understandable but broad enough to require route-scoped abuse controls and telemetry decisions.

No code or configuration was changed by this review.

## Current State

- `backends/gateway/src/middlewares/rateLimitSkip.ts` defines global rate-limit skip prefixes for auth, organizations, webhooks, queue, inngest, misc, and system routes.
- The matcher uses prefix checks, so future sibling paths can be unintentionally skipped if their path starts with an allowed prefix.
- `backends/gateway/src/index.ts` applies the global API rate limiter to `/api/*` only when `shouldSkipGlobalRateLimit(path)` returns false.
- `backends/gateway/src/routes/auth/index.ts` includes session, sign-out, active organization switching, and provider-delegated auth routes under the skipped surface.
- Queue and webhook routes appear to rely on provider-specific verification handlers, but the broad global skip removes generic backpressure and skip telemetry from those endpoints.
- The current skip tests cover intended positive and negative paths, but not boundary matching, method scoping, endpoint-specific counters, Redis fallback behavior, or route-level abuse budgets.

## Security Stop Condition

This item did not require inspecting or reproducing any secret value. No secret, token, connection string, or private key is included in this RFC.

## Architectural Tradeoffs

Option A: replace broad prefix bypasses with route-scoped abuse controls.

This keeps auth polling and provider webhooks available while adding exact route/method matching, per-endpoint counters, and lightweight local limits where global rate limiting is intentionally skipped. It also gives observability a way to distinguish healthy auth polling from abuse.

Option B: keep the broad global bypass and rely on downstream providers.

This minimizes implementation risk for auth and webhook availability, but it leaves the gateway with weak visibility into burst behavior across auth, organization switching, webhooks, queue, and inngest routes.

Option C: rate-limit all API routes uniformly.

This is simple to reason about, but it can break auth session polling, provider retries, webhook delivery, and background job callbacks if limits are not tuned per endpoint.

Recommended direction: choose Option A. The gateway should not make availability-critical routes compete with ordinary product API limits, but bypassed routes still need explicit abuse budgets and observability.

## Decision Information Needed

- What is the expected polling cadence and burst profile for `/api/auth/session`?
- Which skipped auth and organization routes are unauthenticated, user-authenticated, or tenant-authenticated?
- Which webhook, queue, and inngest endpoints have provider signature verification and replay protection?
- What metrics should be emitted for skipped routes: request count, rejected count, signature failures, source IP cardinality, tenant/user key, or provider retry reason?
- Should `/api/auth/*` skip globally, or should only specific methods and paths skip?
- What Redis availability SLO is required before endpoint-specific abuse counters are reliable?

## Proposed Decision Path

1. Inventory each globally skipped prefix by exact route, method, auth requirement, and provider verification model.
2. Decide which endpoints need a local limiter, which need only counters, and which should re-enter the global limiter.
3. Add tests for boundary matching and method-specific skip behavior after the policy decision is made.
4. Add alert thresholds based on abuse signals rather than raw traffic volume alone.

## Non-Goals

- Do not change rate-limit thresholds or skip behavior inside this governance review.
- Do not disable auth, webhook, queue, or inngest routes to reduce risk.
- Do not mask related test failures or lower security assertions if implementation work follows.
