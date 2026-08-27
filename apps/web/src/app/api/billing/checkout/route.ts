import { auditLogger } from "@nebutra/audit";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { getAuth } from "@/lib/auth";
import { appendBillingStatus, resolveBillingReturnUrl } from "@/lib/billing/return-url";

export interface CheckoutRequestBody {
  plan?: unknown;
  planId?: unknown;
  interval?: unknown;
  redirectUrl?: unknown;
}

interface NormalizedBody {
  plan: string;
  interval: string;
  explicitReturnUrl: string | null;
  invalidReturnUrl: boolean;
  wantsJsonResponse: boolean;
  failureMode: "json" | "redirect";
}

async function readBody(request: Request): Promise<NormalizedBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const raw = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const explicitReturnUrl =
      typeof raw.redirectUrl === "string"
        ? resolveExplicitReturnUrl(request, raw.redirectUrl)
        : null;
    const selection = readSelection(raw.plan ?? raw.planId, raw.interval);
    return {
      ...selection,
      explicitReturnUrl,
      invalidReturnUrl: typeof raw.redirectUrl === "string" && explicitReturnUrl === null,
      wantsJsonResponse: typeof raw.redirectUrl === "string",
      failureMode: "json",
    };
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return {
      plan: "",
      interval: "",
      explicitReturnUrl: null,
      invalidReturnUrl: false,
      wantsJsonResponse: false,
      failureMode: "json",
    };
  }

  const redirectUrl = form.get("redirectUrl");
  const explicitReturnUrl =
    typeof redirectUrl === "string" ? resolveExplicitReturnUrl(request, redirectUrl) : null;
  const selection = readSelection(form.get("plan") ?? form.get("planId"), form.get("interval"));

  return {
    ...selection,
    explicitReturnUrl,
    invalidReturnUrl: typeof redirectUrl === "string" && explicitReturnUrl === null,
    wantsJsonResponse: false,
    failureMode: "redirect",
  };
}

function readSelection(plan: unknown, interval: unknown): { plan: string; interval: string } {
  if (typeof plan !== "string" || typeof interval !== "string") {
    return { plan: "", interval: "" };
  }
  const normalizedPlan = plan.trim().toLowerCase();
  const normalizedInterval = interval.trim().toLowerCase();
  const planId =
    normalizedPlan === "plan_pro" ||
    normalizedPlan === "pro_monthly" ||
    normalizedPlan === "pro_yearly"
      ? "pro"
      : normalizedPlan === "plan_enterprise"
        ? "enterprise"
        : normalizedPlan;
  const intervalId =
    normalizedInterval === "month"
      ? "monthly"
      : normalizedInterval === "year"
        ? "yearly"
        : normalizedInterval;
  if (
    (planId === "pro" || planId === "enterprise") &&
    (intervalId === "monthly" || intervalId === "yearly")
  ) {
    return { plan: planId, interval: intervalId };
  }
  return { plan: "", interval: "" };
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

export async function POST(request: Request) {
  const body = await readBody(request);
  const returnUrl = resolveBillingReturnUrl(request);

  const checkoutFailureResponse = (error: string, status: number) => {
    if (body.failureMode === "redirect") {
      return NextResponse.redirect(
        appendBillingStatus(body.explicitReturnUrl ?? returnUrl, "checkout-failed"),
        303,
      );
    }

    return NextResponse.json({ error }, { status });
  };

  if (!process.env.STRIPE_SECRET_KEY) {
    return checkoutFailureResponse(
      "Billing checkout is unavailable because Stripe is not configured.",
      503,
    );
  }

  if (body.invalidReturnUrl) {
    return NextResponse.json({ error: "Invalid billing return URL." }, { status: 400 });
  }

  if (!body.plan || !body.interval) {
    return NextResponse.json(
      { error: "Checkout requires a catalog plan and interval." },
      { status: 400 },
    );
  }

  const upstreamPayload = {
    plan: body.plan,
    interval: body.interval,
  };

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
    return checkoutFailureResponse(
      typeof payload.error === "string" ? payload.error : "Billing checkout could not be created.",
      response.ok ? 502 : response.status,
    );
  }

  const { userId, orgId } = await getAuth(request);
  if (userId && orgId) {
    await auditLogger(request, {
      actor: { id: userId, type: "user" },
      tenantId: orgId,
    }).log({
      action: "billing.checkout.started",
      outcome: "success",
      resource: { type: "billing_plan", id: `${body.plan}:${body.interval}` },
      severity: "info",
    });
  }

  if (body.wantsJsonResponse) {
    return NextResponse.json({ url: payload.url });
  }

  return NextResponse.redirect(payload.url, 303);
}
