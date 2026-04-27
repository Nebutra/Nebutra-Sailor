import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { resolveBillingReturnUrl } from "@/lib/billing/return-url";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Billing portal is unavailable because Stripe is not configured." },
      { status: 503 },
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/billing/portal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ returnUrl: resolveBillingReturnUrl(request) }),
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: unknown; error?: unknown };

  if (!response.ok || typeof payload.url !== "string") {
    return NextResponse.json(
      {
        error:
          typeof payload.error === "string"
            ? payload.error
            : "Billing portal could not be created.",
      },
      { status: response.ok ? 502 : response.status },
    );
  }

  return NextResponse.redirect(payload.url, 303);
}
