/**
 * Server-side Umami event forwarder.
 *
 * Browsers POST to the host domain (e.g. /api/um) instead of the Umami server
 * directly — this bypasses ad-blockers and keeps CN users reachable where
 * third-party analytics hosts are unreliable. The handler forwards the request
 * to the upstream Umami instance, preserving client IP + user agent.
 *
 * Framework-agnostic: accepts a standard `Request` and returns a standard
 * `Response`, so it composes with Next.js Route Handlers, Hono, and any other
 * Web-standard server.
 */
export interface UmamiProxyConfig {
  /** Upstream Umami host, e.g. https://umami.nebutra.com (no trailing slash). */
  umamiHost: string;
  /** Umami website id for this deployment. */
  websiteId: string;
}

export type UmamiProxyHandler = (req: Request) => Promise<Response>;

/**
 * Create an HTTP handler that proxies tracker beacons to Umami.
 *
 * Returns `Promise<UmamiProxyHandler>` rather than the handler directly so
 * async setup (e.g. config loading) can be introduced later without breaking
 * the call sites.
 */
export async function createUmamiProxyHandler(
  config: UmamiProxyConfig,
): Promise<UmamiProxyHandler> {
  const upstream = `${config.umamiHost.replace(/\/$/, "")}/api/send`;

  return async function umamiProxyHandler(req: Request): Promise<Response> {
    let body: string;
    try {
      body = await req.text();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const res = await fetch(upstream, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Website-Id": config.websiteId,
          "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
          "User-Agent": req.headers.get("user-agent") ?? "",
        },
        body,
      });

      const responseText = await res.text();
      return new Response(responseText, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "proxy_failed" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
