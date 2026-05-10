# API Gateway Proxy Layer Design

**Date:** 2026-02-28
**Status:** Approved
**Scope:** Core 3 services — AI, Content, Billing

---

## Context

The `backends/gateway` (Hono, port 3002) currently only health-checks the Python microservices. There is no actual request proxying — clients must call each service directly, bypassing rate limiting, tenant context injection, and auth enforcement enforced by the gateway.

This design adds a proper BFF proxy layer routing traffic through the gateway for the three highest-value services: AI (port 8001), Content (port 8002), and Billing (port 8005).

---

## Approach: Thin Wildcard Proxy

### Why this approach

Three options were evaluated:

| Option                       | Description                                                               | Decision                                                     |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Thin wildcard proxy**      | One `proxyRequest()` utility + per-service router with wildcard catch-all | ✅ Chosen                                                    |
| Explicit per-endpoint routes | Typed Zod-validated handler per upstream route                            | Too much boilerplate; tightly coupled to upstream API shapes |
| Config-driven middleware map | Single middleware reads a `SERVICE_MAP` dict                              | Stripe webhook bypass becomes awkward cross-cutting concern  |

**Chosen:** Thin wildcard proxy. Minimum code, matches existing `legal/`, `misc/`, `system/` pattern, and the Stripe webhook is the only explicit route needed.

---

## New File Structure

```
backends/gateway/src/
  lib/
    proxy.ts          ← proxyRequest() — core proxy utility
    serviceAuth.ts    ← INTERNAL_API_KEY header injection
  routes/
    ai/
      index.ts        ← wildcard proxy → AI service (requireAuth)
    content/
      index.ts        ← wildcard proxy → Content service (requireAuth + requireOrganization)
    billing/
      index.ts        ← Stripe webhook (explicit, no auth) + wildcard (requireAuth)
```

**Modified files:**

- `backends/gateway/src/config/env.ts` — add `BILLING_SERVICE_URL`, `INTERNAL_API_KEY`
- `backends/gateway/src/index.ts` — register 3 route groups; upgrade `onError` to use `@nebutra/errors`
- `backends/gateway/package.json` — add `@nebutra/logger`, `@nebutra/errors` as workspace deps

---

## Path Rewriting

Each service router strips its own prefix and prepends `/api/v1` (matching all FastAPI service mounts):

```
Gateway path                            → Upstream URL
/api/v1/ai/generate                     → http://AI_SERVICE_URL/api/v1/generate
/api/v1/content/posts/abc               → http://CONTENT_SERVICE_URL/api/v1/posts/abc
/api/v1/billing/subscriptions/org_x     → http://BILLING_SERVICE_URL/api/v1/subscriptions/org_x
/api/v1/billing/webhooks/stripe         → http://BILLING_SERVICE_URL/api/v1/webhooks/stripe (raw body, no auth)
```

**URL construction:**

```typescript
// stripPrefix example: "/api/v1/ai"
// upstreamPathPrefix default: "/api/v1"
const tail = pathname.slice(stripPrefix.length); // "/generate"
const upstreamUrl = `${baseUrl}/api/v1${tail}${search}`; // "http://host/api/v1/generate"
```

---

## Service-to-Service Authentication

**Strategy: Static bearer token**

- `INTERNAL_API_KEY` env var → forwarded as `X-Internal-API-Key` header on every upstream request
- Python services validate with a FastAPI `Depends()` guard
- Upgrade path to HMAC (timestamp-bound, replay-resistant) is straightforward when needed

**Stripe webhook exception:** `X-Internal-API-Key` is still forwarded, but `requireAuth` is **not** applied. The billing service validates `Stripe-Signature` independently.

---

## `lib/proxy.ts` — Core Utility Design

```typescript
interface ProxyOptions {
  service: string; // "ai" | "content" | "billing"
  baseUrl: string;
  timeoutMs?: number; // default: 30_000
}

async function proxyRequest(
  c: Context,
  opts: ProxyOptions,
  stripPrefix: string, // e.g. "/api/v1/ai"
): Promise<Response>;
```

**Responsibilities:**

1. Build upstream URL (strip gateway prefix, prepend `/api/v1`)
2. Forward query string from original request
3. Build forwarded headers: tenant context (`X-Organization-Id`, `X-User-Id`, `X-Plan`), internal auth, `Content-Type`, `traceparent` (OTel fallback)
4. Forward body for POST/PUT/PATCH/DELETE
5. Apply `AbortController` timeout
6. On success: stream response back preserving `Content-Type`
7. On upstream error: normalize to `ApiErrorResponse` format (see error table below)

---

## Error Handling

| Scenario                    | HTTP Status  | `error.code`                                         |
| --------------------------- | ------------ | ---------------------------------------------------- |
| Service URL not configured  | 503          | `SERVICE_UNAVAILABLE`                                |
| Upstream 4xx (client error) | pass-through | `EXTERNAL_SERVICE_ERROR` + upstream `detail` message |
| Upstream 5xx                | 502          | `EXTERNAL_SERVICE_ERROR`                             |
| Network failure             | 502          | `EXTERNAL_SERVICE_ERROR`                             |
| Timeout (30s)               | 504          | `TIMEOUT`                                            |

All codes from `@nebutra/errors` `ERROR_CODES`. FastAPI's `{ "detail": "..." }` error format is parsed and surfaced as the human-readable message on 4xx errors.

---

## OTel Trace Propagation

No extra code needed in the proxy. `getNodeAutoInstrumentations()` (already in `@nebutra/logger`'s `initOtel()`) includes `undici`/`fetch` instrumentation — `traceparent` headers are injected automatically when `OTEL_ENABLED=true`.

For dev (`OTEL_ENABLED=false`): any incoming `traceparent` is forwarded manually via `c.req.header("traceparent")`.

---

## Billing — Stripe Webhook Handling

The Stripe webhook requires special handling:

- Registered **before** the wildcard in `billingRoutes` so it runs before `requireAuth`
- Uses `c.req.raw.arrayBuffer()` to preserve the raw byte body (required for `stripe.webhooks.constructEvent()`)
- Validates presence of `Stripe-Signature` header at the gateway (returns 400 if missing)
- Signature verification happens inside the billing service — the gateway only validates presence and proxies raw bytes

---

## Route Registration in `index.ts`

```typescript
app.route("/api/v1/ai", aiRoutes);
app.route("/api/v1/content", contentRoutes);
app.route("/api/v1/billing", billingRoutes);
```

The existing `onError` handler is upgraded from `console.error` to use `toApiError()` + `getStatusCode()` from `@nebutra/errors`.

---

## Test Plan

| File                             | Coverage                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/proxy.test.ts`              | 200 success, 4xx passthrough, 5xx→502, network failure→502, timeout→504, unconfigured→503 |
| `routes/ai/ai.test.ts`           | Missing auth → 401; with auth + mocked fetch → 200                                        |
| `routes/billing/billing.test.ts` | Webhook missing `Stripe-Signature` → 400; authenticated routes require auth               |

Framework: Vitest (existing). Use `vi.stubGlobal("fetch", ...)` for upstream mocking.

---

## Implementation Sequence

1. Add `@nebutra/logger` and `@nebutra/errors` to `api-gateway/package.json`
2. Extend `env.ts` with `BILLING_SERVICE_URL` and `INTERNAL_API_KEY`
3. Create `lib/serviceAuth.ts`
4. Create `lib/proxy.ts`
5. Create `routes/ai/index.ts`
6. Create `routes/content/index.ts`
7. Create `routes/billing/index.ts`
8. Update `index.ts` — register routes + upgrade error handler
9. Write tests (TDD: tests first for `proxy.ts`)

---

## Key Files to Reuse

| File                                                | What to reuse                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `backends/gateway/src/middlewares/tenantContext.ts` | `requireAuth`, `requireOrganization`, `TenantContext` interface      |
| `packages/errors/src/index.ts`                      | `ERROR_CODES`, `toApiError`, `getStatusCode`, `ExternalServiceError` |
| `backends/gateway/src/routes/legal/consent.ts`      | Structural pattern: named Hono export, `c.get("tenant")`, try/catch  |
| `backends/gateway/src/routes/system/status.ts`      | `fetch` with `AbortController` timeout pattern                       |
| `backends/gateway/src/config/env.ts`                | Extend existing Zod schema — don't restructure                       |
