import { createRouterGuard, createRouterRateLimiter } from "@/lib/billing-edge";
import { proxyOpenAiCompatible, RouterSupplyUnavailableError, refuse } from "@/lib/openai-edge";
import { getKeyResolver } from "@/lib/router-keys";

export const runtime = "nodejs";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ path: string[] }> };

const guard = createRouterGuard();
const rateLimit = createRouterRateLimiter();

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  try {
    // One key store (D4) — the resolver is always present now that
    // ROUTER_KEY_STORE and its New-API pass-through mode are gone.
    // The guard is the money spine: reserve, relay, settle. Console routes are
    // not reachable here; they live under /api/console/v1.
    return await proxyOpenAiCompatible(request, path, {
      resolveKey: getKeyResolver(),
      guard,
      rateLimit,
    });
  } catch (error) {
    if (error instanceof RouterSupplyUnavailableError) {
      return refuse(503, "router_unconfigured", "Router supply is not configured.");
    }
    return refuse(
      502,
      "upstream_failed",
      error instanceof Error ? error.message : "upstream_failed",
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
