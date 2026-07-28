import { NextResponse } from "next/server";

/** Lightweight discoverability for Agent/SDK authors. */
export async function GET() {
  return NextResponse.json({
    product: "Nebutra Forge",
    baseUrl: "https://forge.nebutra.com",
    endpoints: {
      listTools: { method: "GET", path: "/api/v1/tools" },
      catalog: { method: "GET", path: "/api/tools.json" },
      openapi: { method: "GET", path: "/api/openapi.json" },
      mcp: { method: "POST", path: "/api/mcp", methods: ["tools/list", "tools/call"] },
      invoke: {
        method: "POST",
        path: "/api/v1/tools/invoke/{toolId}",
        body: { input: "object", requestId: "optional string", tenantId: "optional string" },
      },
      createJob: {
        method: "POST",
        path: "/api/v1/jobs",
        body: { toolId: "string", input: "object" },
      },
      getJob: { method: "GET", path: "/api/v1/jobs/{jobId}" },
    },
    auth: "Bearer sk-sailor-* (scopes tools:*) — optional for free unitCost tools in demo",
    wallet: "Prepaid Nebutra credits; customer ledger is source of truth",
  });
}
