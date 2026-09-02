/**
 * Thin edge gateway.
 *
 * The full gateway (src/index.ts) is a Node backend: Prisma, billing SDKs,
 * queue drivers, email rendering. Bundled for Workers it is 25MB and spends
 * 457ms of CPU evaluating modules before serving anything, against a ~400ms
 * startup budget — it cannot deploy, and shaving dependencies only moved it
 * from 493ms to 457ms because the remaining weight is the application itself
 * registering every OpenAPI route at module scope.
 *
 * This entry does the work that genuinely belongs at the edge and forwards the
 * rest to the Fly Hono origin. What it deliberately does NOT do is re-implement
 * any decision the origin already makes. Duplicated auth or quota logic that
 * drifts from the origin's is worse than the round trip it saves: the two would
 * disagree, and the edge would be the one nobody is looking at.
 *
 * So the split is drawn at "needs no business state":
 *   · health and status — no dependencies, and answering them close to the
 *     caller is the point of a health check
 *   · CORS preflight — a static answer that never needs the origin
 *   · per-IP flood limiting — bounded by address alone, no key lookup, no plan,
 *     counted by Cloudflare's own rate limiting binding
 *
 * Anything keyed on who the caller is (API keys, plans, balances, quotas) stays
 * at the origin, where the logic already lives exactly once.
 */

// @brand-exempt: the only literals are hostnames inside comments explaining which host this
// Worker serves and which one it forwards to. The forwarding target itself is ORIGIN_URL, a
// wrangler var, precisely so it is not hardcoded here.

/**
 * Cloudflare's rate limiting binding, declared in wrangler.edge.toml under
 * `[[ratelimits]]`. Typed here rather than via @cloudflare/workers-types: this
 * file is the whole Worker and has no other reason to carry that dependency.
 */
interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface EdgeEnv {
  /** Origin that is not routed to this Worker. Must not be api.nebutra.com. */
  ORIGIN_URL?: string;
  /** Per-IP flood limit. Limit and period live in wrangler.edge.toml. */
  IP_LIMITER?: RateLimitBinding;
}

function json(body: unknown, status: number, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extra ?? {}) },
  });
}

/**
 * Per-IP flood limit, counted by Cloudflare's rate limiting binding.
 *
 * Until 2026-09-02 this was INCR+EXPIRE against Upstash on every request, so
 * that every colo shared one budget. That was two billed Redis commands per
 * request — scanners and bots included — plus a round trip to Redis's region
 * before the origin fetch could start, and on the invoice it was the bulk of
 * the Upstash line. The binding counts per Cloudflare location, is eventually
 * consistent, and is not metered. For shedding floods that is the right trade:
 * a per-colo limit still bounds any single source, and the per-key limit that
 * actually protects tenants lives at the origin, where the plan is known.
 *
 * Fails open. A missing binding or a failing call must not take the API down;
 * this sheds floods, it is not the only thing between the world and the backend.
 */
async function underIpLimit(request: Request, env: EdgeEnv): Promise<boolean> {
  const limiter = env.IP_LIMITER;
  if (!limiter) return true;

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;

  try {
    const { success } = await limiter.limit({ key: ip });
    return success;
  } catch {
    return true;
  }
}

function corsPreflightResponse(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers":
        request.headers.get("access-control-request-headers") ?? "content-type,authorization",
      "access-control-allow-credentials": "true",
      "access-control-max-age": "86400",
      vary: "origin",
    },
  });
}

const DROP_ON_FORWARD = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "cf-connecting-ip",
  "cf-ray",
  "cf-visitor",
  "cf-ipcountry",
  "x-forwarded-proto",
  "x-forwarded-for",
  "x-real-ip",
]);

/**
 * Copy caller headers for the origin fetch, except Host.
 *
 * Cloning `request.headers` keeps Host: api.nebutra.com. A same-zone
 * subrequest with that Host is routed back into this Worker, Cloudflare
 * detects the loop, and the client gets the HTML 502 page — not our JSON.
 * Auth-edge already strips Host for the same reason. Do not set Host
 * yourself either: workerd rejects it (Error 1101). fetch() takes Host
 * from ORIGIN_URL, which must not be a hostname this Worker is routed on.
 */
export function buildForwardHeaders(request: Request): Headers {
  const incoming = new URL(request.url);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (DROP_ON_FORWARD.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  return headers;
}

async function forward(request: Request, originUrl: string): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(originUrl);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  return fetch(target.toString(), {
    method: request.method,
    headers: buildForwardHeaders(request),
    redirect: "manual",
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // Required by workerd when a streaming body is forwarded.
    ...(request.body ? { duplex: "half" } : {}),
  } as RequestInit);
}

export default {
  async fetch(request: Request, env: EdgeEnv): Promise<Response> {
    const url = new URL(request.url);

    // Deliberately its own path, and deliberately NOT /api/misc/health.
    //
    // Answering the origin's health path here shadows it: monitoring pointed
    // at api.nebutra.com/api/misc/health gets 200 from the edge even when the
    // origin is entirely down, which is worse than having no check at all.
    // That is not hypothetical — it is what hid a real outage, where every
    // forwarded request was coming back as the marketing site while the health
    // endpoint kept reporting ok.
    //
    // /api/misc/health now forwards like everything else, so it means what it
    // says. This one answers only for the edge itself.
    if (url.pathname === "/__edge/health") {
      return json({ status: "ok", layer: "edge" }, 200);
    }

    const preflight = corsPreflightResponse(request);
    if (preflight) return preflight;

    if (!(await underIpLimit(request, env))) {
      return json({ error: "Rate limit exceeded" }, 429, { "retry-after": "60" });
    }

    if (!env.ORIGIN_URL) {
      // Loud rather than silently serving nothing. Pointing this at the same
      // hostname the Worker serves would loop, so it has no safe default.
      return json({ error: "Edge gateway is not configured with an origin" }, 502);
    }

    try {
      return await forward(request, env.ORIGIN_URL);
    } catch {
      return json({ error: "Origin unreachable" }, 502);
    }
  },
};
