import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";

function buildReturnUrl(request: Request) {
  const origin = new URL(request.url).origin;
  return `${origin}/billing`;
}

async function readPriceId(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { priceId?: unknown };
    return typeof body.priceId === "string" ? body.priceId : "";
  }

  const form = await request.formData();
  const priceId = form.get("priceId");
  return typeof priceId === "string" ? priceId : "";
}

export async function POST(request: Request) {
  const priceId = await readPriceId(request);
  const returnUrl = buildReturnUrl(request);

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Billing checkout is unavailable because Stripe is not configured." },
      { status: 503 },
    );
  }

  if (!priceId.startsWith("price_")) {
    return NextResponse.json({ error: "Invalid or missing Stripe price id." }, { status: 400 });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      priceId,
      successUrl: `${returnUrl}?billing=checkout-success`,
      cancelUrl: `${returnUrl}?billing=checkout-canceled`,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: unknown; error?: unknown };

  if (!response.ok || typeof payload.url !== "string") {
    return NextResponse.json(
      {
        error:
          typeof payload.error === "string"
            ? payload.error
            : "Billing checkout could not be created.",
      },
      { status: response.ok ? 502 : response.status },
    );
  }

  return NextResponse.redirect(payload.url, 303);
}
