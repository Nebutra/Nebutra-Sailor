import { getEmbeddedGatewayApp, resolveGatewayMode } from "./gateway-app";

/**
 * Mounts the Hono gateway (backends/gateway) inside Next, so the template's
 * default scaffold ships one process / one origin / one deploy (Sailor
 * Convergence ADR §6, docs/architecture/2026-09-24-sailor-convergence.md).
 *
 * This is an *optional* catch-all (`[[...route]]`) — Next's app router
 * always prefers a more specific route over a catch-all for the same path,
 * so every existing handler under apps/web/src/app/api/** keeps winning;
 * this file only ever receives a request that nothing more specific
 * matched. It is intentionally excluded from the route-handler ratchet's
 * business-handler check (governance.config.json → routeHandlers.intrinsic)
 * — it is a framework mount point, not a business endpoint of its own.
 *
 * GATEWAY_MODE selects the behavior (see ./gateway-app.ts):
 *   - "embedded" (default, fresh scaffold): build the gateway app in-process
 *     (without its background workers — see createGatewayApp) and serve it.
 *   - "external" (Nebutra's own production — set in
 *     .github/workflows/deploy-fly.yml for the `web` Fly app): 404 every
 *     unmatched /api/* path. Nebutra's gateway runs standalone and the
 *     browser already calls it directly; this Next server never proxies to
 *     it, so there is nothing to forward.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND_BODY = JSON.stringify({ error: "Not Found" });

async function handle(request: Request): Promise<Response> {
  if (resolveGatewayMode() === "external") {
    return new Response(NOT_FOUND_BODY, {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const app = await getEmbeddedGatewayApp();
  return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
