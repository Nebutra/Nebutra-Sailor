import { NextResponse } from "next/server";
import { getTypedApi } from "@/lib/api/client";

/**
 * `/api/billing/usage` — same-origin read of the gateway's usage summary.
 *
 * The account dialog is a client component, so it cannot call `getTypedApi()`
 * itself; this route owns the JWT (provider-agnostic, injected server-side) and
 * hands the client a plain JSON body. Shape is the gateway's
 * `GET /api/v1/billing/usage`: { period, apiCalls{used,limit,percentUsed},
 * aiTokens{used} }.
 *
 * Never cached: the dialog is opened precisely when someone wants the current
 * numbers, and a stale quota bar is worse than a missing one.
 */
export async function GET() {
  try {
    const api = await getTypedApi();
    const { data, error, response } = await api.GET("/api/v1/billing/usage");

    if (error || !data) {
      // Cloudflare replaces an origin 502/504 with its own HTML page, which
      // discards this envelope — an upstream failure is 503, ours is 500
      // (tests/architecture/cdn-safe-error-status.test.ts).
      const status = response?.status && response.status >= 400 ? response.status : 503;
      return NextResponse.json({ error: "Usage is unavailable." }, { status });
    }

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Usage is unavailable." }, { status: 500 });
  }
}
