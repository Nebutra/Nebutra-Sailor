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
 * rest to ECS Origin. What it deliberately does NOT do is re-implement any
 * decision the origin already makes. Duplicated auth or quota logic that drifts
 * from the origin's is worse than the round trip it saves: the two would
 * disagree, and the edge would be the one nobody is looking at.
 *
 * So the split is drawn at "needs no business state":
 *   · health and status — no dependencies, and answering them close to the
 *     caller is the point of a health check
 *   · CORS preflight — a static answer that never needs the origin
 *   · per-IP flood limiting — bounded by address alone, no key lookup, no plan
 *
 * Anything keyed on who the caller is (API keys, plans, balances, quotas) stays
 * at the origin, where the logic already lives exactly once.
 */

interface EdgeEnv {
  /** Non-proxied origin hostname. Must not be the hostname this Worker serves. */
  ORIGIN_URL?: string;
  /** Requests per minute per IP before shedding. */
  EDGE_IP_RATE_LIMIT?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

const DEFAULT_IP_RATE_LIMIT = 600;

function json(body: unknown, status: number, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extra ?? {}) },
  });
}

/**
 * Per-IP flood limit, counted in Redis so every colo shares one budget —
 * a per-isolate counter would let each edge location admit the full quota,
 * which is the opposite of a limit.
 *
 * Fails open. Redis being unreachable must not take the API down; the origin
 * still has its own per-key limiting, and this exists to shed floods, not to
 * be the only thing standing between the world and the backend.
 */
async function underIpLimit(request: Request, env: EdgeEnv): Promise<boolean> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true;

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;

  const limit = Number.parseInt(env.EDGE_IP_RATE_LIMIT ?? "", 10) || DEFAULT_IP_RATE_LIMIT;
  const window = Math.floor(Date.now() / 60_000);
  const key = `edge:ip:${ip}:${window}`;

  try {
    // INCR then EXPIRE, pipelined into one round trip. The window key is
    // short-lived by construction, so a missed EXPIRE costs one stale key.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, "120"],
      ]),
    });
    if (!res.ok) return true;
    const parsed = (await res.json()) as Array<{ result?: number }>;
    const count = parsed[0]?.result ?? 0;
    return count <= limit;
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

async function forward(request: Request, originUrl: string): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(originUrl);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  // The origin needs the caller's address and the original host; without these
  // it sees every request as coming from Cloudflare, which breaks its own
  // logging, rate limiting, and any host-based routing.
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  return fetch(target.toString(), {
    method: request.method,
    headers,
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
