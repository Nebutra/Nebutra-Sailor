import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";

/**
 * `/api/billing/usage` — same-origin read of the gateway's usage summary.
 *
 * The account dialog is a client component, so it cannot call the gateway
 * itself; this route forwards the caller's session cookie (the same pattern
 * `api/billing/portal` uses). `getTypedApi()` is not usable here: under
 * better-auth it injects no token and relies on cookies, which a server-side
 * fetch to the gateway origin does not carry — the first cut of this route
 * answered 401 for that reason.
 *
 * Never cached: the dialog is opened precisely when someone wants the current
 * numbers, and a stale quota bar is worse than a missing one. Cloudflare
 * replaces an origin 502/504 with its own HTML page, so an upstream failure is
 * 503 (tests/architecture/cdn-safe-error-status.test.ts).
 */
export async function GET(request: Request) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/billing/usage`, {
      headers: {
        accept: "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || payload === null) {
      return NextResponse.json(
        { error: "Usage is unavailable." },
        { status: response.ok ? 503 : response.status },
      );
    }

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Usage is unavailable." }, { status: 503 });
  }
}
