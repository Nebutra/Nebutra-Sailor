import { auditLogger } from "@nebutra/audit";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { getAuth } from "@/lib/auth";
import { appendBillingStatus, resolveBillingReturnUrl } from "@/lib/billing/return-url";
import { db } from "@/lib/db";

export interface CheckoutRequestBody {
  priceId?: unknown;
  planId?: unknown;
  interval?: unknown;
  redirectUrl?: unknown;
  /**
   * Optional seat count override. When `seatBased` is true and this is omitted,
   * the route counts the calling org's members and uses that as the quantity.
   */
  seats?: unknown;
  /**
   * When true, the route resolves seats from the calling org's member count and
   * forwards it as `quantity` to the gateway checkout factory.
   */
  seatBased?: unknown;
}

interface NormalizedBody {
  priceId: string;
  seats: number | null;
  seatBased: boolean;
  explicitReturnUrl: string | null;
  invalidReturnUrl: boolean;
  wantsJsonResponse: boolean;
}

async function readBody(request: Request): Promise<NormalizedBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const raw = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const explicitReturnUrl =
      typeof raw.redirectUrl === "string"
        ? resolveExplicitReturnUrl(request, raw.redirectUrl)
        : null;
    return {
      priceId:
        typeof raw.priceId === "string"
          ? raw.priceId
          : resolvePriceIdFromPlan(raw.planId, raw.interval),
      seats:
        typeof raw.seats === "number" && Number.isFinite(raw.seats) && raw.seats > 0
          ? Math.floor(raw.seats)
          : null,
      seatBased: raw.seatBased === true,
      explicitReturnUrl,
      invalidReturnUrl: typeof raw.redirectUrl === "string" && explicitReturnUrl === null,
      wantsJsonResponse: typeof raw.redirectUrl === "string",
    };
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return {
      priceId: "",
      seats: null,
      seatBased: false,
      explicitReturnUrl: null,
      invalidReturnUrl: false,
      wantsJsonResponse: false,
    };
  }

  const priceId = form.get("priceId");
  const planId = form.get("planId");
  const interval = form.get("interval");
  const redirectUrl = form.get("redirectUrl");
  const seatsRaw = form.get("seats");
  const seatBasedRaw = form.get("seatBased");
  const seats = typeof seatsRaw === "string" ? Number.parseInt(seatsRaw, 10) : Number.NaN;
  const explicitReturnUrl =
    typeof redirectUrl === "string" ? resolveExplicitReturnUrl(request, redirectUrl) : null;

  return {
    priceId:
      typeof priceId === "string"
        ? priceId
        : resolvePriceIdFromPlan(
            typeof planId === "string" ? planId : undefined,
            typeof interval === "string" ? interval : undefined,
          ),
    seats: Number.isFinite(seats) && seats > 0 ? seats : null,
    seatBased: seatBasedRaw === "true" || seatBasedRaw === "1",
    explicitReturnUrl,
    invalidReturnUrl: typeof redirectUrl === "string" && explicitReturnUrl === null,
    wantsJsonResponse: false,
  };
}

function resolvePriceIdFromPlan(planId: unknown, interval: unknown): string {
  if (typeof planId !== "string") return "";

  const normalizedPlan = planId.toLowerCase();
  const normalizedInterval = interval === "year" ? "year" : "month";

  if (
    normalizedPlan === "plan_pro" ||
    normalizedPlan === "pro" ||
    normalizedPlan === "pro_monthly" ||
    normalizedPlan === "pro_yearly"
  ) {
    if (normalizedPlan === "pro_yearly" || normalizedInterval === "year") {
      return process.env.STRIPE_PRICE_ID_PRO_YEARLY ?? process.env.PRICE_ID_PRO_YEARLY ?? "";
    }

    return process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? process.env.PRICE_ID_PRO_MONTHLY ?? "";
  }

  return "";
}

function resolveExplicitReturnUrl(request: Request, value: string): string | null {
  try {
    const requestUrl = new URL(request.url);
    const explicitUrl = new URL(value, requestUrl.origin);
    if (explicitUrl.origin !== requestUrl.origin) return null;
    return explicitUrl.toString();
  } catch {
    return null;
  }
}

async function resolveSeatQuantity(
  organizationId: string | null,
  explicitSeats: number | null,
): Promise<number | null> {
  if (explicitSeats !== null) return explicitSeats;
  if (!organizationId) return null;

  try {
    const count = await db.organizationMember.count({ where: { organizationId } });
    return count > 0 ? count : 1;
  } catch {
    // Defensive — never block checkout because seat lookup failed.
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const returnUrl = resolveBillingReturnUrl(request);

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Billing checkout is unavailable because Stripe is not configured." },
      { status: 503 },
    );
  }

  if (body.invalidReturnUrl) {
    return NextResponse.json({ error: "Invalid billing return URL." }, { status: 400 });
  }

  if (!body.priceId.startsWith("price_")) {
    return NextResponse.json({ error: "Invalid or missing Stripe price id." }, { status: 400 });
  }

  let quantity: number | null = null;
  if (body.seatBased) {
    const { orgId } = await getAuth(request);
    quantity = await resolveSeatQuantity(orgId, body.seats);
  } else if (body.seats !== null) {
    // Seats provided without seatBased — still respect them as a manual override.
    quantity = body.seats;
  }

  const upstreamPayload: Record<string, unknown> = {
    priceId: body.priceId,
    successUrl: appendBillingStatus(body.explicitReturnUrl ?? returnUrl, "checkout-success"),
    cancelUrl: appendBillingStatus(body.explicitReturnUrl ?? returnUrl, "checkout-canceled"),
  };
  if (quantity !== null) upstreamPayload.quantity = quantity;

  const response = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(upstreamPayload),
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

  // SOC 2 audit — record checkout intent. Resolved auth is best-effort; the
  // event is emitted only if we can scope it to a tenant.
  const { userId, orgId } = await getAuth(request);
  if (userId && orgId) {
    await auditLogger(request, {
      actor: { id: userId, type: "user" },
      tenantId: orgId,
    }).log({
      action: "billing.checkout.started",
      outcome: "success",
      resource: { type: "stripe_price", id: body.priceId },
      severity: "info",
      ...(quantity !== null ? { metadata: { quantity, seatBased: body.seatBased } } : {}),
    });
  }

  if (body.wantsJsonResponse) {
    return NextResponse.json({ url: payload.url });
  }

  return NextResponse.redirect(payload.url, 303);
}
