import { handleSupplyProxy } from "@/lib/supply-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback paste-back. The provider redirects the operator's browser to
 * localhost:51121 (which does not load); the management UI submits that URL
 * here and CLIProxyAPI completes the exchange.
 */
export function GET(request: Request) {
  return handleSupplyProxy(request, "/oauth-callback");
}
export function POST(request: Request) {
  return handleSupplyProxy(request, "/oauth-callback");
}
