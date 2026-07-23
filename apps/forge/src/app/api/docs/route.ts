import { NextResponse } from "next/server";

/** Lightweight discoverability for Agent/SDK authors. */
export async function GET() {
  return NextResponse.json({
    product: "Nebutra Forge",
    baseUrl: "https://forge.nebutra.com",
    endpoints: {
      listTools: { method: "GET", path: "/api/v1/tools" },
      invoke: {
        method: "POST",
        path: "/api/v1/tools/invoke/{toolId}",
        body: { input: "object", requestId: "optional string", tenantId: "optional string" },
      },
    },
    auth: "Bearer sk-sailor-* (scopes tools:*) — optional for free unitCost tools in demo",
    wallet: "Prepaid Nebutra credits; customer ledger is source of truth",
  });
}
