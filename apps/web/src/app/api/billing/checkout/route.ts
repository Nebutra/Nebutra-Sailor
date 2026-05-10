import { auditLogger } from "@nebutra/audit";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { getAuth } from "@/lib/auth";
import { appendBillingStatus, resolveBillingReturnUrl } from "@/lib/billing/return-url";
import { db } from "@/lib/db";

export interface CheckoutRequestBody {
  priceId?: unknown;
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
}

async function readBody(request: Request): Promise<NormalizedBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const raw = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    return {
      priceId: typeof raw.priceId === "string" ? raw.priceId : "",
      seats:
        typeof raw.seats === "number" && Number.isFinite(raw.seats) && raw.seats > 0
          ? Math.floor(raw.seats)
          : null,
      seatBased: raw.seatBased === true,
    };
  }

  const form = await request.formData().catch(() => null);
  if (!form) return { priceId: "", seats: null, seatBased: false };

  const priceId = form.get("priceId");
  const seatsRaw = form.get("seats");
  const seatBasedRaw = form.get("seatBased");
  const seats = typeof seatsRaw === "string" ? Number.parseInt(seatsRaw, 10) : Number.NaN;

  return {
    priceId: typeof priceId === "string" ? priceId : "",
    seats: Number.isFinite(seats) && seats > 0 ? seats : null,
    seatBased: seatBasedRaw === "true" || seatBasedRaw === "1",
  };
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
    successUrl: appendBillingStatus(returnUrl, "checkout-success"),
    cancelUrl: appendBillingStatus(returnUrl, "checkout-canceled"),
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

  return NextResponse.redirect(payload.url, 303);
}
