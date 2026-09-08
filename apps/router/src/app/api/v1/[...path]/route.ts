import {
  openaiError,
  proxyOpenAiCompatible,
  RouterSupplyUnavailableError,
} from "@/lib/openai-edge";
import { getKeyResolver } from "@/lib/router-keys";
import { recordRouterUsage } from "@/lib/usage-ledger";

export const runtime = "nodejs";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  try {
    const resolveKey = getKeyResolver();
    return await proxyOpenAiCompatible(request, path, {
      ...(resolveKey ? { resolveKey, onUsage: recordRouterUsage } : {}),
    });
  } catch (error) {
    if (error instanceof RouterSupplyUnavailableError) {
      return openaiError(503, "router_unconfigured");
    }
    return openaiError(502, error instanceof Error ? error.message : "upstream_failed");
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
