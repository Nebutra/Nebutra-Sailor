import { handleSupplyProxy } from "@/lib/supply-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CLIProxyAPI's bundled management UI, served through the control plane. */
export function GET(request: Request) {
  return handleSupplyProxy(request, "/management.html");
}
