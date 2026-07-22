/**
 * Production HA edge entry for api.nebutra.com
 *
 * @see docs/ops/production-ha-topology.md
 *
 * - Global Cloudflare Worker (multi-colo)
 * - D1 for edge meta (greenfield)
 * - Origin: ECS full gateway via cf.resolveOverride (no Worker loop)
 * - Composite /_nebutra/ha for single-pane health
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  success: boolean;
  meta: Record<string, unknown>;
  results: T[];
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface EdgeProxyEnv {
  DB?: D1Database;
  ORIGIN_RESOLVE: string;
  ORIGIN_HOST?: string;
  GATEWAY_SHARED_SECRET?: string;
  /** When "true", refuse proxy if GATEWAY_SHARED_SECRET is unset (fail closed). */
  REQUIRE_GATEWAY_SECRET?: string;
  LANDING_URL?: string;
  WEB_URL?: string;
  STUDIO_URL?: string;
}

const DEFAULT_ORIGIN_HOST = "api.nebutra.com";
const DEFAULT_ORIGIN_RESOLVE = "106.15.4.31";
const ORIGIN_TIMEOUT_MS = 12_000;
const ORIGIN_RETRIES = 1;

function corsOrigins(env: EdgeProxyEnv): string[] {
  return [
    env.LANDING_URL ?? "https://nebutra.com",
    "https://www.nebutra.com",
    env.WEB_URL ?? "https://app.nebutra.com",
    env.STUDIO_URL ?? "https://studio.nebutra.com",
  ].filter(Boolean);
}

/** Baseline security headers for every edge response. */
function withSecurityHeaders(headers: Headers): Headers {
  const h = new Headers(headers);
  if (!h.has("strict-transport-security")) {
    h.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
  if (!h.has("x-content-type-options")) {
    h.set("x-content-type-options", "nosniff");
  }
  if (!h.has("x-frame-options")) {
    h.set("x-frame-options", "DENY");
  }
  if (!h.has("referrer-policy")) {
    h.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  if (!h.has("permissions-policy")) {
    h.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  }
  // Collapse duplicate Cache-Control if upstream set multiples
  const cc = h.get("cache-control");
  if (cc && cc.includes("no-store") && cc.split("no-store").length > 2) {
    h.set("cache-control", "no-store, no-cache, must-revalidate");
  }
  return h;
}

function applyCors(request: Request, response: Response, env: EdgeProxyEnv): Response {
  const origin = request.headers.get("Origin");
  const headers = withSecurityHeaders(response.headers);
  if (origin && corsOrigins(env).includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preflight(request: Request, env: EdgeProxyEnv): Response {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = corsOrigins(env).includes(origin);
  const headers = withSecurityHeaders(
    new Headers({
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") ??
        "Content-Type, Authorization, X-Request-Id, X-Nebutra-Request-Id",
      "Access-Control-Max-Age": "86400",
    }),
  );
  if (allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = withSecurityHeaders(new Headers(init.headers));
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-nebutra-edge", "cloudflare-workers-proxy");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function probeD1(
  env: EdgeProxyEnv,
): Promise<{ status: "up" | "down" | "skipped"; latencyMs: number; schemaVersion?: string }> {
  if (!env.DB) return { status: "skipped", latencyMs: 0 };
  const t0 = Date.now();
  try {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key = ?")
      .bind("schema_version")
      .first<{ value: string }>();
    return {
      status: "up",
      latencyMs: Date.now() - t0,
      ...(row?.value ? { schemaVersion: row.value } : {}),
    };
  } catch {
    return { status: "down", latencyMs: Date.now() - t0 };
  }
}

async function probeOrigin(env: EdgeProxyEnv): Promise<{
  status: "up" | "down";
  latencyMs: number;
  httpStatus?: number;
  bodyStatus?: string;
  cache?: string;
}> {
  const originHost = env.ORIGIN_HOST || DEFAULT_ORIGIN_HOST;
  const t0 = Date.now();
  try {
    const res = await fetchOrigin(
      env,
      new Request(`https://${originHost}/api/misc/health`, { method: "GET" }),
      crypto.randomUUID(),
    );
    const latencyMs = Date.now() - t0;
    let bodyStatus: string | undefined;
    let cache: string | undefined;
    try {
      const body = (await res.json()) as {
        status?: string;
        dependencies?: { cache?: { status?: string } };
      };
      bodyStatus = body.status;
      cache = body.dependencies?.cache?.status;
    } catch {
      /* non-json */
    }
    return {
      status: res.ok ? "up" : "down",
      latencyMs,
      httpStatus: res.status,
      ...(bodyStatus ? { bodyStatus } : {}),
      ...(cache ? { cache } : {}),
    };
  } catch {
    return { status: "down", latencyMs: Date.now() - t0 };
  }
}

async function fetchOrigin(
  env: EdgeProxyEnv,
  request: Request,
  requestId: string,
): Promise<Response> {
  const originHost = env.ORIGIN_HOST || DEFAULT_ORIGIN_HOST;
  const originResolve = env.ORIGIN_RESOLVE || DEFAULT_ORIGIN_RESOLVE;
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, `https://${originHost}`);

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  const headers = new Headers(request.headers);
  headers.set("Host", originHost);
  headers.set("x-nebutra-request-id", requestId);
  headers.set("x-request-id", requestId);
  if (clientIp) {
    headers.set("x-nebutra-client-ip", clientIp);
    headers.set("x-forwarded-for", clientIp);
  }
  if (env.GATEWAY_SHARED_SECRET) {
    headers.set("x-nebutra-gateway-secret", env.GATEWAY_SHARED_SECRET);
  }
  headers.delete("cf-connecting-ip");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= ORIGIN_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ORIGIN_TIMEOUT_MS);
    try {
      const init: RequestInit & { cf?: { resolveOverride: string }; duplex?: string } = {
        method: request.method,
        headers,
        redirect: "manual",
        signal: controller.signal,
        cf: { resolveOverride: originResolve },
      };
      if (request.method !== "GET" && request.method !== "HEAD" && attempt === 0) {
        init.body = request.body;
        init.duplex = "half";
      }
      const res = await fetch(target.toString(), init);
      clearTimeout(timer);
      // Retry only idempotent methods on 502/503/504
      if (
        attempt < ORIGIN_RETRIES &&
        (request.method === "GET" || request.method === "HEAD") &&
        (res.status === 502 || res.status === 503 || res.status === 504)
      ) {
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt >= ORIGIN_RETRIES) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("origin fetch failed");
}

async function logApiEvent(
  env: EdgeProxyEnv,
  opts: { path: string; method: string; status: number; requestId: string },
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO api_events (id, path, method, status, request_id) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        `evt_${crypto.randomUUID().replace(/-/g, "")}`,
        opts.path.slice(0, 500),
        opts.method,
        opts.status,
        opts.requestId,
      )
      .run();
  } catch {
    /* best-effort */
  }
}

async function handleEdgeRoutes(
  request: Request,
  env: EdgeProxyEnv,
  url: URL,
  requestId: string,
): Promise<Response | null> {
  // Composite HA panel
  if (url.pathname === "/_nebutra/ha" && (request.method === "GET" || request.method === "HEAD")) {
    const [d1, origin] = await Promise.all([probeD1(env), probeOrigin(env)]);
    const edgeOk = true;
    const d1Ok = d1.status !== "down";
    const originOk = origin.status === "up";
    const overall =
      edgeOk && d1Ok && originOk
        ? origin.cache === "down"
          ? "degraded"
          : "healthy"
        : originOk || d1Ok
          ? "degraded"
          : "unhealthy";

    return json(
      {
        status: overall,
        topology: "cf-edge-proxy+d1 → ecs-origin",
        checks: {
          edge: { status: "up", runtime: "cloudflare-workers" },
          d1,
          origin,
        },
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: overall === "unhealthy" ? 503 : 200 },
    );
  }

  if (
    (url.pathname === "/_nebutra/edge-health" || url.pathname === "/__edge/health") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const d1 = await probeD1(env);
    const ok = d1.status !== "down";
    return json(
      {
        status: ok ? "ok" : "degraded",
        edge: "cloudflare-workers",
        mode: "origin-proxy+d1",
        d1,
        originHost: env.ORIGIN_HOST || DEFAULT_ORIGIN_HOST,
        originResolve: env.ORIGIN_RESOLVE || DEFAULT_ORIGIN_RESOLVE,
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: ok ? 200 : 503 },
    );
  }

  if (!env.DB) {
    if (url.pathname.startsWith("/_nebutra/db")) {
      return json({ error: "D1_NOT_BOUND" }, { status: 503 });
    }
    return null;
  }

  if (url.pathname === "/_nebutra/db/health" && request.method === "GET") {
    const t0 = Date.now();
    try {
      const meta = await env.DB.prepare("SELECT key, value FROM meta").all<{
        key: string;
        value: string;
      }>();
      const tenants = await env.DB.prepare("SELECT COUNT(*) AS c FROM tenants").first<{
        c: number;
      }>();
      const users = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first<{ c: number }>();
      return json({
        status: "up",
        provider: "cloudflare-d1",
        database: "nebutra",
        latencyMs: Date.now() - t0,
        meta: Object.fromEntries((meta.results ?? []).map((r) => [r.key, r.value])),
        counts: { tenants: tenants?.c ?? 0, users: users?.c ?? 0 },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return json(
        {
          status: "down",
          provider: "cloudflare-d1",
          error: err instanceof Error ? err.message : String(err),
          requestId,
        },
        { status: 503 },
      );
    }
  }

  if (url.pathname === "/_nebutra/db/tenants" && request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT id, slug, name, plan, created_at FROM tenants ORDER BY created_at ASC",
    ).all();
    return json({ success: true, data: rows.results ?? [], requestId });
  }

  if (url.pathname === "/_nebutra/db/tenants" && request.method === "POST") {
    let body: { slug?: string; name?: string; plan?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "INVALID_JSON" }, { status: 400 });
    }
    const slug = (body.slug ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim();
    const plan = (body.plan ?? "free").trim() || "free";
    if (!slug || !name) {
      return json({ error: "slug and name are required" }, { status: 400 });
    }
    const id = `tenant_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    try {
      await env.DB.prepare("INSERT INTO tenants (id, slug, name, plan) VALUES (?, ?, ?, ?)")
        .bind(id, slug, name, plan)
        .run();
      const row = await env.DB.prepare(
        "SELECT id, slug, name, plan, created_at FROM tenants WHERE id = ?",
      )
        .bind(id)
        .first();
      return json({ success: true, data: row, requestId }, { status: 201 });
    } catch (err) {
      return json(
        {
          error: "INSERT_FAILED",
          message: err instanceof Error ? err.message : String(err),
          requestId,
        },
        { status: 409 },
      );
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: EdgeProxyEnv): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
    const requestId =
      request.headers.get("x-nebutra-request-id") ||
      request.headers.get("x-request-id") ||
      crypto.randomUUID();

    // status.nebutra.com — dedicated HA surface (must not 301 to marketing)
    if (host === "status.nebutra.com") {
      if (url.pathname === "/status.json" || url.pathname === "/" || url.pathname === "") {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/_nebutra/ha";
        const inner = new Request(rewritten.toString(), request);
        const res = await handleEdgeRoutes(inner, env, rewritten, requestId);
        if (res) {
          const headers = new Headers(res.headers);
          headers.set("x-nebutra-request-id", requestId);
          return applyCors(request, new Response(res.body, { status: res.status, headers }), env);
        }
      }
      return applyCors(
        request,
        json(
          {
            error: "NOT_FOUND",
            message: "Use GET / or /status.json on status.nebutra.com",
            requestId,
          },
          { status: 404 },
        ),
        env,
      );
    }

    if (request.method === "OPTIONS") {
      return preflight(request, env);
    }

    if (
      env.REQUIRE_GATEWAY_SECRET === "true" &&
      !env.GATEWAY_SHARED_SECRET &&
      !url.pathname.startsWith("/_nebutra/")
    ) {
      return applyCors(
        request,
        json(
          {
            error: "MISCONFIGURED",
            message: "GATEWAY_SHARED_SECRET required but not bound",
            requestId,
          },
          { status: 500 },
        ),
        env,
      );
    }

    const edgeRes = await handleEdgeRoutes(request, env, url, requestId);
    if (edgeRes) {
      const headers = new Headers(edgeRes.headers);
      headers.set("x-nebutra-request-id", requestId);
      const res = new Response(edgeRes.body, {
        status: edgeRes.status,
        statusText: edgeRes.statusText,
        headers,
      });
      return applyCors(request, res, env);
    }

    let upstream: Response;
    try {
      upstream = await fetchOrigin(env, request, requestId);
    } catch (err) {
      const fail = json(
        {
          error: "ORIGIN_UNREACHABLE",
          message: err instanceof Error ? err.message : "origin fetch failed",
          requestId,
          originResolve: env.ORIGIN_RESOLVE || DEFAULT_ORIGIN_RESOLVE,
        },
        { status: 502 },
      );
      void logApiEvent(env, {
        path: url.pathname,
        method: request.method,
        status: 502,
        requestId,
      });
      return applyCors(request, fail, env);
    }

    const responseHeaders = withSecurityHeaders(upstream.headers);
    responseHeaders.set("x-nebutra-request-id", requestId);
    responseHeaders.set("x-nebutra-edge", "cloudflare-workers-proxy");
    responseHeaders.set("x-nebutra-db", env.DB ? "cloudflare-d1" : "none");

    const response = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });

    void logApiEvent(env, {
      path: url.pathname,
      method: request.method,
      status: upstream.status,
      requestId,
    });

    return applyCors(request, response, env);
  },
};
