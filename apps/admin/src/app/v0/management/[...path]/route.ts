import { handleSupplyProxy } from "@/lib/supply-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path: string[] }> };

/** CLIProxyAPI Management API, with the management key injected server-side. */
async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return handleSupplyProxy(request, `/v0/management/${path.map(encodeURIComponent).join("/")}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
