# API Gateway Proxy Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a thin wildcard proxy layer to the Hono API gateway that routes requests to the AI (port 8001), Content (port 8002), and Billing (port 8005) Python/FastAPI microservices — with tenant context forwarding, static service-to-service auth, and proper error normalization.

**Architecture:** One shared `proxyRequest()` utility builds the upstream URL, injects tenant + auth headers, and normalizes errors. Three per-service route files (ai, content, billing) apply auth guards then call the utility via a wildcard catch-all. The Stripe webhook is the only explicitly defined route (raw body, no auth guard). All error codes come from the existing `@nebutra/errors` package.

**Tech Stack:** Hono (TypeScript), Zod, `@nebutra/errors`, `@nebutra/logger` (Pino), Vitest + `vi.stubGlobal` for fetch mocking.

**Design doc:** `docs/plans/2026-02-28-api-gateway-proxy-design.md`

---

## Task 1: Add workspace dependencies and extend env schema

**Files:**

- Modify: `backends/gateway/package.json`
- Modify: `backends/gateway/src/config/env.ts`

**Context:** The gateway doesn't yet declare `@nebutra/logger` or `@nebutra/errors` as dependencies. The env schema is also missing `BILLING_SERVICE_URL` and `INTERNAL_API_KEY` (used for service-to-service auth).

**Step 1: Add deps to package.json**

Open `backends/gateway/package.json`. In the `"dependencies"` object, add:

```json
"@nebutra/errors": "workspace:*",
"@nebutra/logger": "workspace:*"
```

**Step 2: Install**

```bash
cd /path/to/repo && pnpm install
```

Expected: no errors. `node_modules/@nebutra/errors` and `node_modules/@nebutra/logger` symlinks appear.

**Step 3: Extend env.ts**

In `backends/gateway/src/config/env.ts`, add two new fields to the `envSchema` object, after the existing `WEB3_SERVICE_URL` line:

```typescript
  // Service-to-service auth (shared secret forwarded as X-Internal-API-Key)
  INTERNAL_API_KEY: z.string().optional(),
  // Billing service URL (not yet in schema)
  BILLING_SERVICE_URL: z.string().optional(),
```

The `// Service URLs` block should now look like:

```typescript
  // Service URLs
  AI_SERVICE_URL: z.string().optional(),
  CONTENT_SERVICE_URL: z.string().optional(),
  RECSYS_SERVICE_URL: z.string().optional(),
  ECOMMERCE_SERVICE_URL: z.string().optional(),
  WEB3_SERVICE_URL: z.string().optional(),
  BILLING_SERVICE_URL: z.string().optional(),

  // Service-to-service auth (shared secret forwarded as X-Internal-API-Key)
  INTERNAL_API_KEY: z.string().optional(),
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm --filter @nebutra/api-gateway typecheck
```

Expected: no errors.

**Step 5: Commit**

```bash
git add backends/gateway/package.json backends/gateway/src/config/env.ts pnpm-lock.yaml
git commit -m "feat(api-gateway): add errors/logger deps and extend env schema with BILLING_SERVICE_URL and INTERNAL_API_KEY"
```

---

## Task 2: Create `lib/serviceAuth.ts`

**Files:**

- Create: `backends/gateway/src/lib/serviceAuth.ts`

**Context:** Every proxied request (except Stripe webhooks bypassing our auth, but still forwarding the key) needs an `X-Internal-API-Key` header. This tiny utility reads the env and returns the header dict, so `proxy.ts` can import it. No test needed — it's a one-liner that's tested implicitly via proxy tests.

**Step 1: Create the file**

```typescript
// backends/gateway/src/lib/serviceAuth.ts
import { env } from "../config/env.js";

/**
 * Returns an X-Internal-API-Key header when INTERNAL_API_KEY is configured.
 * Python microservices validate this header to accept only gateway-originated requests.
 * Upgrade path: replace static token with HMAC signing here when needed.
 */
export function buildServiceAuthHeader(): Record<string, string> {
  if (!env.INTERNAL_API_KEY) return {};
  return { "X-Internal-API-Key": env.INTERNAL_API_KEY };
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @nebutra/api-gateway typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add backends/gateway/src/lib/serviceAuth.ts
git commit -m "feat(api-gateway): add serviceAuth helper for X-Internal-API-Key header injection"
```

---

## Task 3: TDD — `lib/proxy.ts` core utility

**Files:**

- Create: `backends/gateway/src/lib/proxy.test.ts` (write first)
- Create: `backends/gateway/src/lib/proxy.ts`

**Context:** `proxyRequest(c, opts, stripPrefix)` is the heart of the proxy layer. It:

1. Strips the gateway prefix and prepends `/api/v1` to build the upstream URL
2. Injects tenant context headers, internal auth header, and `traceparent`
3. Forwards body for mutating methods (POST/PUT/PATCH/DELETE)
4. Uses `AbortController` for timeouts
5. Normalizes upstream errors to `@nebutra/errors` format

For tests, we create a minimal Hono app that wraps `proxyRequest` and use `app.request()` (Hono's built-in test helper) to drive requests. We mock `fetch` globally with `vi.stubGlobal`.

**Step 1: Write the failing tests**

Create `backends/gateway/src/lib/proxy.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../middlewares/tenantContext.js";
import { proxyRequest } from "./proxy.js";

// Mock serviceAuth so tests are independent of INTERNAL_API_KEY env var
vi.mock("./serviceAuth.js", () => ({
  buildServiceAuthHeader: () => ({}),
}));

function makeTestApp(baseUrl: string) {
  const app = new Hono();
  // Install tenant context middleware (sets c.get("tenant"))
  app.use("*", tenantContextMiddleware);
  // Mount proxy on /api/v1/ai prefix — mirrors real usage
  app.all("/api/v1/ai/*", (c) =>
    proxyRequest(c, { service: "ai", baseUrl }, "/api/v1/ai"),
  );
  return app;
}

describe("proxyRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"result":"ok"}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const app = makeTestApp("http://localhost:8001");
    const res = await app.request("/api/v1/ai/generate", {
      method: "POST",
      headers: { "X-User-Id": "user_1", "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: "ok" });
  });

  it("strips the gateway prefix and prepends /api/v1 for upstream URL", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(
          new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    const app = makeTestApp("http://localhost:8001");
    await app.request("/api/v1/ai/embed?model=ada", { method: "GET" });

    // /api/v1/ai is stripped → /embed → prepend /api/v1 → /api/v1/embed
    expect(capturedUrl).toBe("http://localhost:8001/api/v1/embed?model=ada");
  });

  it("passes through 4xx status and parses FastAPI detail message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"detail":"Input too long"}', {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const app = makeTestApp("http://localhost:8001");
    const res = await app.request("/api/v1/ai/generate", { method: "POST" });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(body.error.message).toBe("Input too long");
  });

  it("returns 502 on upstream 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    const app = makeTestApp("http://localhost:8001");
    const res = await app.request("/api/v1/ai/generate");

    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });

  it("returns 502 on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const app = makeTestApp("http://localhost:8001");
    const res = await app.request("/api/v1/ai/generate");

    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });

  it("returns 504 when fetch throws AbortError (timeout)", async () => {
    const abortError = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const app = makeTestApp("http://localhost:8001");
    const res = await app.request("/api/v1/ai/generate");

    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe("TIMEOUT");
  });

  it("forwards tenant context headers to upstream", async () => {
    const capturedHeaders: Record<string, string> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const h = init.headers as Headers;
        h.forEach((v, k) => {
          capturedHeaders[k] = v;
        });
        return Promise.resolve(
          new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    const app = makeTestApp("http://localhost:8001");
    await app.request("/api/v1/ai/generate", {
      headers: {
        "X-User-Id": "user_abc",
        "X-Organization-Id": "org_xyz",
        "X-Plan": "PRO",
      },
    });

    expect(capturedHeaders["x-user-id"]).toBe("user_abc");
    expect(capturedHeaders["x-organization-id"]).toBe("org_xyz");
    expect(capturedHeaders["x-plan"]).toBe("PRO");
  });
});
```

**Step 2: Run tests — expect them to fail with "module not found"**

```bash
pnpm --filter @nebutra/api-gateway test src/lib/proxy.test.ts
```

Expected: FAIL — `Cannot find module './proxy.js'`

**Step 3: Write the implementation**

Create `backends/gateway/src/lib/proxy.ts`:

```typescript
import { Context } from "hono";
import { ERROR_CODES } from "@nebutra/errors";
import { buildServiceAuthHeader } from "./serviceAuth.js";

export interface ProxyOptions {
  service: string; // human-readable name for logs and error messages
  baseUrl: string; // e.g. "http://localhost:8001"
  timeoutMs?: number; // default: 30_000ms
}

/**
 * Build the upstream URL by:
 * 1. Stripping the gateway-side prefix (e.g. "/api/v1/ai")
 * 2. Prepending "/api/v1" (all FastAPI services mount their routes here)
 * 3. Preserving the original query string
 *
 * Example: "/api/v1/ai/embed?model=ada" → "http://localhost:8001/api/v1/embed?model=ada"
 */
function buildUpstreamUrl(
  baseUrl: string,
  requestUrl: string,
  stripPrefix: string,
): string {
  const url = new URL(requestUrl);
  const tail = url.pathname.slice(stripPrefix.length) || "/";
  return `${baseUrl}/api/v1${tail}${url.search}`;
}

/**
 * Build headers to forward to the upstream service:
 * - Tenant context headers (X-Organization-Id, X-User-Id, X-Plan)
 * - Content-Type from the original request
 * - Internal service auth (X-Internal-API-Key) from serviceAuth
 * - W3C traceparent for distributed tracing (forwarded from client as fallback;
 *   OTel auto-instrumentation injects it automatically when OTEL_ENABLED=true)
 */
function buildForwardedHeaders(
  c: Context,
  authHeaders: Record<string, string>,
): Headers {
  const tenant = c.get("tenant");
  const headers = new Headers();

  if (tenant?.organizationId)
    headers.set("X-Organization-Id", tenant.organizationId);
  if (tenant?.userId) headers.set("X-User-Id", tenant.userId);
  if (tenant?.plan) headers.set("X-Plan", tenant.plan);

  const contentType = c.req.header("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  for (const [k, v] of Object.entries(authHeaders)) {
    headers.set(k, v);
  }

  const traceparent = c.req.header("traceparent");
  if (traceparent) headers.set("traceparent", traceparent);

  return headers;
}

/**
 * Normalize an upstream error response into { error: { code, message } } format.
 * - FastAPI returns { "detail": "..." } for validation errors — we surface this as the message.
 * - 4xx errors are passed through with the original status code.
 * - 5xx errors are converted to 502 to hide internal details.
 */
async function normalizeUpstreamError(
  response: Response,
  service: string,
): Promise<{ body: object; status: number }> {
  let detail: string | undefined;
  try {
    const json = (await response.json()) as Record<string, unknown>;
    detail = typeof json.detail === "string" ? json.detail : undefined;
  } catch {
    // non-JSON upstream response body — detail stays undefined
  }

  const isClientError = response.status >= 400 && response.status < 500;
  return {
    status: isClientError ? response.status : 502,
    body: {
      error: {
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        message:
          detail ??
          (isClientError
            ? `Request rejected by ${service} service`
            : `The ${service} service is temporarily unavailable`),
      },
    },
  };
}

/**
 * Forward a Hono request to an upstream FastAPI microservice.
 *
 * @param c - Hono context (must have "tenant" set by tenantContextMiddleware)
 * @param opts - Service name, base URL, and optional timeout
 * @param stripPrefix - Gateway path prefix to strip before forwarding (e.g. "/api/v1/ai")
 */
export async function proxyRequest(
  c: Context,
  opts: ProxyOptions,
  stripPrefix: string,
): Promise<Response> {
  const { service, baseUrl, timeoutMs = 30_000 } = opts;
  const upstreamUrl = buildUpstreamUrl(baseUrl, c.req.url, stripPrefix);
  const headers = buildForwardedHeaders(c, buildServiceAuthHeader());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Only read the body for methods that carry a body
  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method);
  const body = hasBody ? await c.req.raw.clone().text() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: c.req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const { body: errBody, status } = await normalizeUpstreamError(
        upstream,
        service,
      );
      return c.json(
        errBody as Parameters<typeof c.json>[0],
        status as Parameters<typeof c.json>[1],
      );
    }

    // Stream the response back, preserving Content-Type
    const responseBody = await upstream.text();
    const contentType =
      upstream.headers.get("content-type") ?? "application/json";
    return new Response(responseBody, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === "AbortError") {
      return c.json(
        {
          error: {
            code: ERROR_CODES.TIMEOUT,
            message: `The ${service} service did not respond in time`,
          },
        },
        504,
      );
    }

    return c.json(
      {
        error: {
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: `Unable to reach the ${service} service`,
        },
      },
      502,
    );
  }
}
```

**Step 4: Run tests — expect them all to pass**

```bash
pnpm --filter @nebutra/api-gateway test src/lib/proxy.test.ts
```

Expected: 6 passing tests.

**Step 5: Verify TypeScript**

```bash
pnpm --filter @nebutra/api-gateway typecheck
```

Expected: no errors.

**Step 6: Commit**

```bash
git add backends/gateway/src/lib/proxy.ts backends/gateway/src/lib/proxy.test.ts
git commit -m "feat(api-gateway): add proxyRequest utility with error normalization and timeout handling"
```

---

## Task 4: TDD — AI service route

**Files:**

- Create: `backends/gateway/src/routes/ai/ai.test.ts` (write first)
- Create: `backends/gateway/src/routes/ai/index.ts`

**Context:** The `routes/ai/` directory already exists but is empty. The AI route:

- Applies `requireAuth` (returns 401 if `X-User-Id` header is absent)
- Checks `AI_SERVICE_URL` is configured (returns 503 if not)
- Delegates everything else to `proxyRequest`

For testing, we mock `proxy.ts` and `env.ts` with `vi.mock`, then drive the Hono app via `app.request()`.

**Step 1: Write the failing tests**

Create `backends/gateway/src/routes/ai/ai.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../../middlewares/tenantContext.js";

vi.mock("../../lib/proxy.js", () => ({
  proxyRequest: vi.fn().mockResolvedValue(
    new Response('{"text":"hello"}', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    AI_SERVICE_URL: "http://localhost:8001",
    NODE_ENV: "test",
    PORT: "3002",
  },
}));

async function makeApp() {
  const { aiRoutes } = await import("./index.js");
  const app = new Hono();
  app.use("*", tenantContextMiddleware);
  app.route("/api/v1/ai", aiRoutes);
  return app;
}

describe("AI routes", () => {
  it("returns 401 when X-User-Id is missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/ai/generate", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("proxies the request when authenticated", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/ai/generate", {
      method: "POST",
      headers: { "X-User-Id": "user_1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "hello" });
  });
});
```

**Step 2: Run tests — expect them to fail**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/ai/ai.test.ts
```

Expected: FAIL — `Cannot find module './index.js'`

**Step 3: Write the implementation**

Create `backends/gateway/src/routes/ai/index.ts`:

```typescript
import { Hono } from "hono";
import { requireAuth } from "../../middlewares/tenantContext.js";
import { proxyRequest } from "../../lib/proxy.js";
import { env } from "../../config/env.js";
import { ERROR_CODES } from "@nebutra/errors";

export const aiRoutes = new Hono();

// All AI routes require an authenticated user
aiRoutes.use("*", requireAuth);

const STRIP_PREFIX = "/api/v1/ai";

/**
 * Wildcard proxy — forwards all methods and paths to the AI microservice.
 *
 * Gateway path → Upstream path (examples):
 *   POST /api/v1/ai/generate → POST http://AI_SERVICE_URL/api/v1/generate
 *   POST /api/v1/ai/embed    → POST http://AI_SERVICE_URL/api/v1/embed
 *   POST /api/v1/ai/translate → POST http://AI_SERVICE_URL/api/v1/translate
 */
aiRoutes.all("/*", async (c) => {
  if (!env.AI_SERVICE_URL) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: "AI service is not configured",
        },
      },
      503,
    );
  }
  return proxyRequest(
    c,
    { service: "ai", baseUrl: env.AI_SERVICE_URL },
    STRIP_PREFIX,
  );
});
```

**Step 4: Run tests — expect them to pass**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/ai/ai.test.ts
```

Expected: 2 passing tests.

**Step 5: Commit**

```bash
git add backends/gateway/src/routes/ai/index.ts backends/gateway/src/routes/ai/ai.test.ts
git commit -m "feat(api-gateway): add AI service proxy route with requireAuth guard"
```

---

## Task 5: Content service route

**Files:**

- Create: `backends/gateway/src/routes/content/index.ts`

**Context:** The `routes/content/` directory already exists. The content route is nearly identical to AI, but adds `requireOrganization` (returns 403 if `X-Organization-Id` header is absent) because all content is org-scoped. No separate test file — the pattern is identical to AI and fully exercised by proxy.test.ts. Add a smoke test in the same style as ai.test.ts.

**Step 1: Create `routes/content/content.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../../middlewares/tenantContext.js";

vi.mock("../../lib/proxy.js", () => ({
  proxyRequest: vi.fn().mockResolvedValue(
    new Response('{"id":"post_1"}', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    CONTENT_SERVICE_URL: "http://localhost:8002",
    NODE_ENV: "test",
    PORT: "3002",
  },
}));

async function makeApp() {
  const { contentRoutes } = await import("./index.js");
  const app = new Hono();
  app.use("*", tenantContextMiddleware);
  app.route("/api/v1/content", contentRoutes);
  return app;
}

describe("Content routes", () => {
  it("returns 401 when X-User-Id is missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/content/posts", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when X-Organization-Id is missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/content/posts", {
      method: "GET",
      headers: { "X-User-Id": "user_1" },
    });
    expect(res.status).toBe(403);
  });

  it("proxies the request when authenticated with org context", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/content/posts/post_1", {
      method: "GET",
      headers: { "X-User-Id": "user_1", "X-Organization-Id": "org_1" },
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run tests — expect them to fail**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/content/content.test.ts
```

Expected: FAIL — `Cannot find module './index.js'`

**Step 3: Write the implementation**

Create `backends/gateway/src/routes/content/index.ts`:

```typescript
import { Hono } from "hono";
import {
  requireAuth,
  requireOrganization,
} from "../../middlewares/tenantContext.js";
import { proxyRequest } from "../../lib/proxy.js";
import { env } from "../../config/env.js";
import { ERROR_CODES } from "@nebutra/errors";

export const contentRoutes = new Hono();

// Content is always scoped to an organization — require both user auth and org membership
contentRoutes.use("*", requireAuth);
contentRoutes.use("*", requireOrganization);

const STRIP_PREFIX = "/api/v1/content";

/**
 * Wildcard proxy — forwards all methods and paths to the Content microservice.
 *
 * Gateway path → Upstream path (examples):
 *   POST /api/v1/content/posts         → POST http://CONTENT_SERVICE_URL/api/v1/posts
 *   GET  /api/v1/content/posts/abc     → GET  http://CONTENT_SERVICE_URL/api/v1/posts/abc
 *   POST /api/v1/content/feed          → POST http://CONTENT_SERVICE_URL/api/v1/feed
 *   POST /api/v1/content/comments      → POST http://CONTENT_SERVICE_URL/api/v1/comments
 */
contentRoutes.all("/*", async (c) => {
  if (!env.CONTENT_SERVICE_URL) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: "Content service is not configured",
        },
      },
      503,
    );
  }
  return proxyRequest(
    c,
    { service: "content", baseUrl: env.CONTENT_SERVICE_URL },
    STRIP_PREFIX,
  );
});
```

**Step 4: Run tests — expect them to pass**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/content/content.test.ts
```

Expected: 3 passing tests.

**Step 5: Commit**

```bash
git add backends/gateway/src/routes/content/index.ts backends/gateway/src/routes/content/content.test.ts
git commit -m "feat(api-gateway): add content service proxy route with requireAuth and requireOrganization guards"
```

---

## Task 6: TDD — Billing service route (with Stripe webhook)

**Files:**

- Create: `backends/gateway/src/routes/billing/billing.test.ts` (write first)
- Create: `backends/gateway/src/routes/billing/index.ts`

**Context:** The billing router has two logical sections:

1. **`POST /webhooks/*`** — registered _before_ the auth middleware. Stripe-Signature is validated at the gateway (returns 400 if absent). The raw request body (ArrayBuffer) is forwarded intact — Stripe's HMAC verification inside the billing service requires the byte-exact original body.
2. **`/*` (wildcard)** — registered _after_ `requireAuth`. Handles subscriptions, usage, credits.

The `billingRoutes` Hono app processes routes in registration order, so the webhook handler fires before the auth middleware catches it.

**Step 1: Write the failing tests**

Create `backends/gateway/src/routes/billing/billing.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { Hono } from "hono";
import { tenantContextMiddleware } from "../../middlewares/tenantContext.js";

vi.mock("../../lib/proxy.js", () => ({
  proxyRequest: vi.fn().mockResolvedValue(
    new Response('{"plan":"PRO"}', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    BILLING_SERVICE_URL: "http://localhost:8005",
    INTERNAL_API_KEY: "test-secret",
    NODE_ENV: "test",
    PORT: "3002",
  },
}));

async function makeApp() {
  const { billingRoutes } = await import("./index.js");
  const app = new Hono();
  app.use("*", tenantContextMiddleware);
  app.route("/api/v1/billing", billingRoutes);
  return app;
}

describe("Billing routes — Stripe webhook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when Stripe-Signature header is missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/billing/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("Stripe-Signature");
  });

  it("proxies the webhook with raw body when Stripe-Signature is present", async () => {
    const rawPayload = JSON.stringify({ type: "invoice.paid" });
    let capturedBody = "";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve(
          new Response('{"received":true}', { status: 200 }),
        );
      }),
    );

    const app = await makeApp();
    const res = await app.request("/api/v1/billing/webhooks/stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=123,v1=abc",
      },
      body: rawPayload,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(capturedBody).toBeTruthy(); // body was forwarded
  });

  it("does not require authentication for webhook endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response('{"received":true}', { status: 200 })),
    );

    const app = await makeApp();
    // No X-User-Id header — should still succeed (no 401)
    const res = await app.request("/api/v1/billing/webhooks/stripe", {
      method: "POST",
      headers: { "Stripe-Signature": "t=123,v1=abc" },
      body: "{}",
    });
    expect(res.status).toBe(200);
  });
});

describe("Billing routes — authenticated endpoints", () => {
  it("returns 401 when X-User-Id is missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/billing/subscriptions/org_1", {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("proxies subscription request when authenticated", async () => {
    const app = await makeApp();
    const res = await app.request("/api/v1/billing/subscriptions/org_1", {
      method: "GET",
      headers: { "X-User-Id": "user_1" },
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run tests — expect them to fail**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/billing/billing.test.ts
```

Expected: FAIL — `Cannot find module './index.js'`

**Step 3: Write the implementation**

Create `backends/gateway/src/routes/billing/index.ts`:

```typescript
import { Hono } from "hono";
import { requireAuth } from "../../middlewares/tenantContext.js";
import { proxyRequest } from "../../lib/proxy.js";
import { env } from "../../config/env.js";
import { ERROR_CODES } from "@nebutra/errors";

export const billingRoutes = new Hono();

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook — registered BEFORE requireAuth so it bypasses auth middleware.
// Stripe sends POST requests directly; the billing service validates the
// Stripe-Signature header internally using the raw, unmodified request body.
// ─────────────────────────────────────────────────────────────────────────────
billingRoutes.post("/webhooks/*", async (c) => {
  if (!env.BILLING_SERVICE_URL) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: "Billing service is not configured",
        },
      },
      503,
    );
  }

  const stripeSignature = c.req.header("stripe-signature");
  if (!stripeSignature) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: "Missing Stripe-Signature header",
        },
      },
      400,
    );
  }

  // Capture the raw body as an ArrayBuffer — MUST be byte-exact for Stripe HMAC verification
  const rawBody = await c.req.raw.arrayBuffer();
  const upstreamPath = new URL(c.req.url).pathname.slice(
    "/api/v1/billing".length,
  );
  const upstreamUrl = `${env.BILLING_SERVICE_URL}/api/v1${upstreamPath}`;

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": c.req.header("content-type") ?? "application/json",
        "Stripe-Signature": stripeSignature,
        // Still forward internal auth so the billing service knows this came through the gateway
        ...(env.INTERNAL_API_KEY
          ? { "X-Internal-API-Key": env.INTERNAL_API_KEY }
          : {}),
      },
      body: rawBody,
    });

    if (!response.ok) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            message: "Webhook processing failed",
          },
        },
        502,
      );
    }

    return c.json({ received: true });
  } catch {
    return c.json(
      {
        error: {
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: "Unable to process webhook",
        },
      },
      502,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// All other billing routes — require authenticated user
// ─────────────────────────────────────────────────────────────────────────────
billingRoutes.use("*", requireAuth);

const STRIP_PREFIX = "/api/v1/billing";

/**
 * Wildcard proxy — forwards all methods and paths to the Billing microservice.
 *
 * Gateway path → Upstream path (examples):
 *   GET  /api/v1/billing/subscriptions/org_1 → GET  http://BILLING_SERVICE_URL/api/v1/subscriptions/org_1
 *   POST /api/v1/billing/usage               → POST http://BILLING_SERVICE_URL/api/v1/usage
 *   POST /api/v1/billing/credits             → POST http://BILLING_SERVICE_URL/api/v1/credits
 */
billingRoutes.all("/*", async (c) => {
  if (!env.BILLING_SERVICE_URL) {
    return c.json(
      {
        error: {
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: "Billing service is not configured",
        },
      },
      503,
    );
  }
  return proxyRequest(
    c,
    { service: "billing", baseUrl: env.BILLING_SERVICE_URL },
    STRIP_PREFIX,
  );
});
```

**Step 4: Run tests — expect them to pass**

```bash
pnpm --filter @nebutra/api-gateway test src/routes/billing/billing.test.ts
```

Expected: 5 passing tests.

**Step 5: Commit**

```bash
git add backends/gateway/src/routes/billing/index.ts backends/gateway/src/routes/billing/billing.test.ts
git commit -m "feat(api-gateway): add billing service proxy route with stripe webhook raw body forwarding"
```

---

## Task 7: Wire routes into `index.ts` and upgrade error handler

**Files:**

- Modify: `backends/gateway/src/index.ts`

**Context:** Two changes:

1. Import and register the three new route groups under `/api/v1/ai`, `/api/v1/content`, `/api/v1/billing`
2. Replace the `onError` handler's `console.error` with `@nebutra/logger` and its raw `c.json({ error: "Internal Server Error" })` with the properly shaped `toApiError()` + `getStatusCode()` from `@nebutra/errors`

**Step 1: Add the three route imports**

In `backends/gateway/src/index.ts`, after the existing import block, add:

```typescript
import { aiRoutes } from "./routes/ai/index.js";
import { contentRoutes } from "./routes/content/index.js";
import { billingRoutes } from "./routes/billing/index.js";
import { logger } from "@nebutra/logger";
import { toApiError, getStatusCode } from "@nebutra/errors";
```

**Step 2: Register the routes**

After the existing `app.route("/api/v1/legal", consentRoutes)` line, add:

```typescript
// Proxied microservice routes
app.route("/api/v1/ai", aiRoutes);
app.route("/api/v1/content", contentRoutes);
app.route("/api/v1/billing", billingRoutes);
```

**Step 3: Upgrade the `onError` handler**

Replace the existing `app.onError` block:

```typescript
// BEFORE:
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});
```

With:

```typescript
// AFTER:
app.onError((err, c) => {
  logger.error({ err }, "Unhandled error in API gateway");
  const status = getStatusCode(err);
  const body = toApiError(err, c.req.header("x-request-id"));
  return c.json(body, status as Parameters<typeof c.json>[1]);
});
```

**Step 4: Verify TypeScript**

```bash
pnpm --filter @nebutra/api-gateway typecheck
```

Expected: no errors.

**Step 5: Smoke test — start the gateway and hit a new route**

```bash
# In one terminal:
pnpm --filter @nebutra/api-gateway dev

# In another terminal:
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-User-Id: user_1" \
  http://localhost:3002/api/v1/ai/generate
```

Expected: `503` (AI_SERVICE_URL not set in dev env) — confirms route is registered and auth passes.

**Step 6: Commit**

```bash
git add backends/gateway/src/index.ts
git commit -m "feat(api-gateway): register ai/content/billing proxy routes and upgrade onError handler to use @nebutra/errors"
```

---

## Task 8: Run full test suite and verify

**Step 1: Run all api-gateway tests**

```bash
pnpm --filter @nebutra/api-gateway test
```

Expected: all tests pass (proxy.test.ts × 6, ai.test.ts × 2, content.test.ts × 3, billing.test.ts × 5, plus any pre-existing tests).

**Step 2: Run the full monorepo typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 3: Verify the gateway starts cleanly**

```bash
pnpm --filter @nebutra/api-gateway dev
```

Expected: `API Gateway starting on http://localhost:3002` (no startup errors).

**Step 4: Final commit if any fixes were needed**

If any tests or type errors required fixes, commit them:

```bash
git add -A
git commit -m "fix(api-gateway): address type errors and test failures from integration"
```

---

## Testing Against Live Services (Optional Manual Verification)

Start the Python services locally (requires Docker or direct Python env):

```bash
# Terminal 1 — AI service
cd backends/python/ai && uvicorn app.main:app --port 8001 --reload

# Terminal 2 — Gateway
AI_SERVICE_URL=http://localhost:8001 pnpm --filter @nebutra/api-gateway dev
```

Then test a real proxy:

```bash
curl -X POST http://localhost:3002/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_test" \
  -d '{"prompt": "hello", "max_tokens": 50}'
```

Expected: response from the AI service (or a well-formed error if the service isn't fully configured).

---

## Key Files Reference

| File                                                | Purpose                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `backends/gateway/src/lib/proxy.ts`                 | Core proxy utility (URL rewriting, header forwarding, error normalization) |
| `backends/gateway/src/lib/serviceAuth.ts`           | Builds `X-Internal-API-Key` header                                         |
| `backends/gateway/src/routes/ai/index.ts`           | AI service wildcard proxy (requireAuth)                                    |
| `backends/gateway/src/routes/content/index.ts`      | Content service wildcard proxy (requireAuth + requireOrganization)         |
| `backends/gateway/src/routes/billing/index.ts`      | Billing proxy + Stripe webhook raw body handler                            |
| `backends/gateway/src/config/env.ts`                | Zod env schema (extended with BILLING_SERVICE_URL, INTERNAL_API_KEY)       |
| `backends/gateway/src/index.ts`                     | Route registration and error handler                                       |
| `backends/gateway/src/middlewares/tenantContext.ts` | `requireAuth`, `requireOrganization`, `TenantContext`                      |
| `packages/platform/errors/src/index.ts`                      | `ERROR_CODES`, `toApiError`, `getStatusCode`                               |
