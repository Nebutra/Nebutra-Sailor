/**
 * Thin auth edge — Free Workers plan safe (~200 KiB gzip), not OpenNext.
 *
 * Why this exists (hard-correct, not "pay to ship"):
 *   Full Next OpenNext auth is ~8.5 MiB gzip → Free plan 3 MiB rejects it.
 *   Paying for Workers Paid to run a marketing panel at the edge is the wrong
 *   trade. Google OAuth token exchange + session DB is the only work that
 *   *must* leave China ECS; the sign-in UI can stay on origin.
 *
 * Split (mirrors backends/gateway worker-edge):
 *   · /api/auth/*  → Better Auth + Hyperdrive→PlanetScale (overseas egress)
 *   · /health?probe=google → edge probe (proves Google reachability)
 *   · everything else → ECS origin via cf.resolveOverride (Host unchanged)
 *
 * Same BETTER_AUTH_SECRET + auth_* tables as the Node/Next auth-center so
 * sessions minted here are accepted by app RPs.
 */

import { brand } from "@nebutra/brand/metadata";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { attachPoolErrorGuard, isPgConnectFailure, withConnectRetry } from "./lib/auth-edge-pool";

interface HyperdriveBinding {
  connectionString: string;
}

export interface AuthEdgeEnv {
  HYPERDRIVE?: HyperdriveBinding;
  /** ECS origin IP for UI pass-through (HTTP). */
  ORIGIN_IP?: string;
  /** Optional full origin base, e.g. http://106.15.4.31 — preferred over ORIGIN_IP alone. */
  ORIGIN_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  AUTH_COOKIE_DOMAIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  DATABASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_AUTH_URL?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
}

// betterAuth() is generic over its options; keep a wide handle so the
// singleton can be rebuilt when secrets/DB change without TS gymnastics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthInstance = { handler: (request: Request) => Promise<Response>; api: any };

let pool: Pool | null = null;
let authSingleton: AuthInstance | null = null;
let authKey = "";

/** Drop a dead isolate pool. Do not pool.end() here — that races in-flight queries into 1101. */
function discardAuthPool(dead?: Pool | null): void {
  if (dead && pool && dead !== pool) return;
  pool = null;
  authSingleton = null;
  authKey = "";
}

// Derived from brand.domains rather than typed out, so a rebrand moves the
// trusted origins with everything else. A stale entry here is not a cosmetic
// drift: it decides which sites may carry a session.
const DEFAULT_TRUSTED = [
  `https://${brand.domains.landing}`,
  `https://www.${brand.domains.landing}`,
  `https://${brand.domains.app}`,
  `https://${brand.domains.auth}`,
  `https://${brand.domains.forge}`,
  `https://${brand.domains.router}`,
] as const;

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extra ?? {}) },
  });
}

function applyEnv(env: AuthEdgeEnv): void {
  const pairs: Array<[keyof AuthEdgeEnv, string]> = [
    ["BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET"],
    ["BETTER_AUTH_URL", "BETTER_AUTH_URL"],
    ["AUTH_COOKIE_DOMAIN", "AUTH_COOKIE_DOMAIN"],
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    ["GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_ID"],
    ["GITHUB_CLIENT_SECRET", "GITHUB_CLIENT_SECRET"],
    ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"],
    ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_URL"],
    ["NEXT_PUBLIC_AUTH_URL", "NEXT_PUBLIC_AUTH_URL"],
    ["BETTER_AUTH_TRUSTED_ORIGINS", "BETTER_AUTH_TRUSTED_ORIGINS"],
  ];
  for (const [envKey, processKey] of pairs) {
    const value = env[envKey];
    if (typeof value === "string" && value.trim()) {
      process.env[processKey] = value.trim();
    }
  }
  const hyperdrive = env.HYPERDRIVE?.connectionString?.trim();
  if (hyperdrive) {
    process.env.DATABASE_URL = hyperdrive;
  } else if (env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = env.DATABASE_URL.trim();
  }
}

function connectionString(env: AuthEdgeEnv): string | null {
  return (
    env.HYPERDRIVE?.connectionString?.trim() ||
    env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null
  );
}

function trustedOrigins(env: AuthEdgeEnv): string[] {
  const extra = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fromEnv = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return [...new Set([...DEFAULT_TRUSTED, ...fromEnv, ...extra])];
}

/**
 * Physical table names match Prisma @@map on AuthUser/AuthSession/… so the
 * edge and the Node auth-center share one session store.
 */
function getAuth(env: AuthEdgeEnv): AuthInstance {
  applyEnv(env);
  const secret = env.BETTER_AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required on the auth edge Worker");
  }
  const dbUrl = connectionString(env);
  if (!dbUrl) {
    throw new Error("HYPERDRIVE or DATABASE_URL is required on the auth edge Worker");
  }

  // One Pool per isolate — never pool.end() on the request path (races → 1101).
  const key = `${secret.slice(0, 8)}:${dbUrl.slice(0, 48)}`;
  if (authSingleton && authKey === key && pool) {
    return authSingleton;
  }

  pool = new Pool({
    connectionString: dbUrl,
    // Workers: tiny pool; Hyperdrive handles real pooling.
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: false,
  });
  attachPoolErrorGuard(pool, (err) => {
    console.error("[nebutra-auth] pg pool error", err.message);
    discardAuthPool(pool);
  });
  authKey = key;

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  const googleId = env.GOOGLE_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (googleId && googleSecret) {
    socialProviders.google = { clientId: googleId, clientSecret: googleSecret };
  }
  const ghId = env.GITHUB_CLIENT_ID?.trim() || process.env.GITHUB_CLIENT_ID?.trim();
  const ghSecret = env.GITHUB_CLIENT_SECRET?.trim() || process.env.GITHUB_CLIENT_SECRET?.trim();
  if (ghId && ghSecret) {
    socialProviders.github = { clientId: ghId, clientSecret: ghSecret };
  }

  const baseURL =
    env.BETTER_AUTH_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    `https://${brand.domains.auth}`;
  const cookieDomain =
    env.AUTH_COOKIE_DOMAIN?.trim() ||
    process.env.AUTH_COOKIE_DOMAIN?.trim() ||
    `.${brand.domains.landing}`;

  const instance = betterAuth({
    secret,
    baseURL,
    trustedOrigins: trustedOrigins(env),
    emailAndPassword: { enabled: true },
    socialProviders,
    onAPIError: { errorURL: "/sign-in" },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
    },
    // Pool → Kysely path (no Prisma / no 17 MiB workerd client).
    database: pool,
    user: {
      modelName: "auth_users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    session: {
      modelName: "auth_sessions",
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    account: {
      modelName: "auth_accounts",
      fields: {
        userId: "user_id",
        accountId: "account_id",
        providerId: "provider_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        idToken: "id_token",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "auth_verifications",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
  }) as AuthInstance;

  authSingleton = instance;
  return instance;
}

async function probeGoogle(env: AuthEdgeEnv, origin: string): Promise<Record<string, unknown>> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret =
    env.GOOGLE_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri = `${origin.replace(/\/$/, "")}/api/auth/callback/google`;
  const clientIdSuffix = clientId.length > 28 ? `…${clientId.slice(-28)}` : clientId || null;

  if (!clientId || !clientSecret) {
    return {
      status: "incomplete_env",
      clientIdSuffix,
      redirectUri,
      googleError: null,
      googleErrorDescription: null,
    };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: "nebutra-health-probe-not-a-real-code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      error_description?: string;
    } | null;
    const googleError = data?.error ?? (res.ok ? null : `http_${res.status}`);
    let status = "redirect_or_other";
    if (googleError === "invalid_grant") status = "pair_ok";
    else if (googleError === "invalid_client") status = "invalid_client";
    else if (googleError === "invalid_request") status = "incomplete_env";
    return {
      status,
      clientIdSuffix,
      redirectUri,
      googleError,
      googleErrorDescription: data?.error_description ?? null,
    };
  } catch (error) {
    return {
      status: "network_error",
      clientIdSuffix,
      redirectUri,
      googleError: null,
      googleErrorDescription: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleHealth(request: Request, env: AuthEdgeEnv): Promise<Response> {
  const url = new URL(request.url);
  const origin =
    env.BETTER_AUTH_URL?.trim() ||
    env.NEXT_PUBLIC_AUTH_URL?.trim() ||
    `${url.protocol}//${url.host}`;

  const body: Record<string, unknown> = {
    service: "nebutra-auth-center",
    status: "ok",
    layer: "edge",
    origin,
    role: "login-center-edge",
    deploy: "cloudflare-workers-edge",
    // Bump when shipping edge fixes so /health proves the new script is live.
    edgeBuild: "2026-08-27-pg-pool-guard",
    features: {
      authApi: true,
      // ORIGIN_URL is the preferred pass-through; ORIGIN_IP alone is legacy.
      uiPassThrough: Boolean(env.ORIGIN_URL?.trim() || env.ORIGIN_IP?.trim()),
      hyperdrive: Boolean(env.HYPERDRIVE?.connectionString),
    },
    oauth: {
      providers: [
        env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID ? "google" : null,
        env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID ? "github" : null,
      ].filter(Boolean),
      callbackUrls: [
        `${origin.replace(/\/$/, "")}/api/auth/callback/google`,
        `${origin.replace(/\/$/, "")}/api/auth/callback/github`,
      ],
    },
  };

  if (url.searchParams.get("probe") === "google") {
    body.oauth = {
      ...(body.oauth as object),
      googlePairing: await probeGoogle(env, origin),
    };
  }

  if (url.searchParams.get("probe") === "db") {
    body.database = await probeDatabase(env);
  }

  return json(body, 200, { "cache-control": "no-store" });
}

/** One-off SELECT 1 — does not touch the request-path singleton. */
async function probeDatabase(env: AuthEdgeEnv): Promise<Record<string, unknown>> {
  const dbUrl = connectionString(env);
  if (!dbUrl) {
    return { status: "missing_env" };
  }

  const started = Date.now();
  const client = new Pool({
    connectionString: dbUrl,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: false,
  });
  attachPoolErrorGuard(client, (err) => {
    console.error("[nebutra-auth] db probe pool error", err.message);
  });
  try {
    await client.query("SELECT 1");
    return { status: "ok", ms: Date.now() - started };
  } catch (error) {
    return {
      status: isPgConnectFailure(error) ? "timeout" : "error",
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Better Auth social start often returns **200 + JSON** `{ url, redirect: true }`
 * with a `Location` header and state cookie. Top-level browser navigation only
 * follows 3xx — a 200 body is rendered as raw JSON (what users saw). Convert
 * to 302 while preserving every Set-Cookie (state cookie is required).
 */
async function asBrowserOAuthRedirect(res: Response): Promise<Response> {
  let location = res.headers.get("location");
  if (!location) {
    try {
      const data = (await res.clone().json()) as { url?: string; redirect?: boolean };
      if (typeof data?.url === "string" && data.url.startsWith("http")) {
        location = data.url;
      }
    } catch {
      // not JSON
    }
  }
  if (!location) return res;

  // Already a real redirect status — keep as-is.
  if (res.status >= 300 && res.status < 400) return res;

  const headers = new Headers();
  headers.set("Location", location);
  const getSetCookie = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.bind(res.headers);
  if (typeof getSetCookie === "function") {
    for (const cookie of getSetCookie()) {
      if (cookie) headers.append("Set-Cookie", cookie);
    }
  } else {
    const single = res.headers.get("set-cookie");
    if (single) headers.append("Set-Cookie", single);
  }
  return new Response(null, { status: 302, headers });
}

/**
 * GET /api/auth/oauth/:provider?callbackURL=… — same contract as the Next route.
 * BA's native social start is POST /sign-in/social; product links use this GET.
 */
async function handleOAuthStart(
  request: Request,
  env: AuthEdgeEnv,
  provider: string,
): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") {
    return json({ code: "METHOD_NOT_ALLOWED", error: "OAuth start requests must use GET." }, 405);
  }
  if (provider !== "google" && provider !== "github") {
    return json(
      {
        code: "OAUTH_PROVIDER_NOT_SUPPORTED",
        error: "This OAuth provider is not supported.",
        provider,
      },
      400,
    );
  }

  const url = new URL(request.url);
  const appOrigin =
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `https://${brand.domains.app}`;
  const rawCallback =
    url.searchParams.get("callbackURL") ??
    url.searchParams.get("callback") ??
    url.searchParams.get("returnUrl") ??
    url.searchParams.get("returnTo") ??
    url.searchParams.get("redirect");
  let callbackURL = `${appOrigin.replace(/\/$/, "")}/workspace`;
  if (rawCallback?.trim()) {
    const trimmed = rawCallback.trim();
    if (trimmed.startsWith("/")) {
      callbackURL = `${appOrigin.replace(/\/$/, "")}${trimmed}`;
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      callbackURL = trimmed;
    }
  }

  try {
    return await withConnectRetry(
      async () => {
        const auth = getAuth(env);
        const result = await auth.api.signInSocial({
          body: { provider, callbackURL },
          headers: request.headers,
          asResponse: true,
        });
        return asBrowserOAuthRedirect(result);
      },
      () => discardAuthPool(),
    );
  } catch (error) {
    return json(
      {
        code: "OAUTH_START_FAILED",
        error: "Unable to start OAuth sign-in.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

async function handleAuthApi(request: Request, env: AuthEdgeEnv): Promise<Response> {
  if (request.method.toUpperCase() === "OPTIONS") {
    const origin = request.headers.get("origin") ?? "*";
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers":
          request.headers.get("access-control-request-headers") ??
          "content-type,authorization,x-captcha-response",
        "access-control-allow-credentials": "true",
        "access-control-max-age": "86400",
        vary: "origin",
      },
    });
  }

  const url = new URL(request.url);
  const oauthMatch = url.pathname.match(/\/api\/auth\/oauth\/([^/]+)\/?$/);
  if (oauthMatch?.[1]) {
    return handleOAuthStart(request, env, decodeURIComponent(oauthMatch[1]));
  }

  try {
    return await withConnectRetry(
      async () => {
        const auth = getAuth(env);
        const res = await auth.handler(request);
        // Top-level social start must 302 (see asBrowserOAuthRedirect).
        const path = new URL(request.url).pathname;
        if (
          path.includes("/sign-in/social") ||
          path.includes("/signin/social") ||
          path.includes("/oauth/")
        ) {
          return asBrowserOAuthRedirect(res);
        }
        return res;
      },
      () => discardAuthPool(),
    );
  } catch (error) {
    return json(
      {
        code: "AUTH_EDGE_ERROR",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * UI pass-through to ECS.
 *
 * Never self-fetch https://auth.nebutra.com (loops into this Worker → CF 522).
 * CF terminates TLS; origin is HTTP to ECS (same as Flexible SSL), with Host +
 * X-Forwarded-Proto so nginx can serve without 301→https bounce.
 *
 * ORIGIN_URL optional (e.g. http://106.15.4.31). Defaults to http://ORIGIN_IP.
 */
/**
 * UI → ECS via grey-cloud origin.nebutra.com (gateway-edge pattern).
 * Never Host=auth.nebutra.com on fetch (CF 1003). Never self-fetch (522 loop).
 * Nginx routes X-Nebutra-Edge-Auth: 1 → nebutra_auth.
 */
async function forwardToOrigin(request: Request, env: AuthEdgeEnv): Promise<Response> {
  const originBase = env.ORIGIN_URL?.trim() || `https://${brand.domains.origin}`;
  let base: URL;
  try {
    base = new URL(originBase);
  } catch {
    return json({ error: "ORIGIN_URL is invalid" }, 502);
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, base);
  // Build a clean header set — never mutate/copy hop-by-hop or forbidden names
  // (setting Host on Workers can throw → Error 1101).
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      k === "host" ||
      k === "connection" ||
      k === "content-length" ||
      k === "transfer-encoding" ||
      k === "cf-connecting-ip" ||
      k === "cf-ray" ||
      k === "cf-visitor" ||
      k === "cf-ipcountry" ||
      k === "x-forwarded-proto" ||
      k === "x-forwarded-for" ||
      k === "x-real-ip"
    ) {
      return;
    }
    headers.set(key, value);
  });
  headers.set("x-forwarded-host", brand.domains.auth);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-nebutra-edge-auth", "1");
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    const signal = timeoutSignal(15_000);
    if (signal) init.signal = signal;
    if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
      init.body = request.body;
      // Required by workerd when forwarding a stream.
      (init as RequestInit & { duplex?: string }).duplex = "half";
    }
    return await fetch(target.toString(), init);
  } catch (error) {
    return json(
      {
        error: "Auth origin unreachable from edge",
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}

/** Prefer AbortSignal.timeout; fall back so older runtimes never throw on construct. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
  } catch {
    // ignore
  }
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  } catch {
    return undefined;
  }
}

export default {
  async fetch(request: Request, env: AuthEdgeEnv): Promise<Response> {
    // Never surface Error 1101 to browsers — always return a Response.
    try {
      const url = new URL(request.url);

      if (url.pathname === "/__edge/health") {
        return json({ status: "ok", layer: "auth-edge" }, 200, { "cache-control": "no-store" });
      }

      // Health (incl. Google probe) answers on the edge so operators see overseas
      // egress, not a false-green from a China origin that cannot reach Google.
      if (url.pathname === "/health") {
        return await handleHealth(request, env);
      }

      if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
        return await handleAuthApi(request, env);
      }

      return await forwardToOrigin(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      // Log for wrangler tail / Workers Observability
      console.error("[nebutra-auth]", message, stack ?? "");
      return json(
        {
          error: "Auth edge exception",
          message,
          layer: "auth-edge",
        },
        500,
        { "cache-control": "no-store" },
      );
    }
  },
};
