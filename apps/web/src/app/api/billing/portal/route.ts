import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { appendBillingStatus, resolveBillingReturnUrl } from "@/lib/billing/return-url";

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function failureResponse(request: Request, returnUrl: string, error: string, status: number) {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.redirect(appendBillingStatus(returnUrl, "portal-failed"), 303);
}

export async function POST(request: Request) {
  const returnUrl = resolveBillingReturnUrl(request);

  if (!process.env.STRIPE_SECRET_KEY) {
    return failureResponse(
      request,
      returnUrl,
      "Billing portal is unavailable because Stripe is not configured.",
      503,
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/billing/portal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ returnUrl }),
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: unknown; error?: unknown };

  if (!response.ok || typeof payload.url !== "string") {
    return failureResponse(
      request,
      returnUrl,
      typeof payload.error === "string" ? payload.error : "Billing portal could not be created.",
      response.ok ? 502 : response.status,
    );
  }

  return NextResponse.redirect(payload.url, 303);
}
