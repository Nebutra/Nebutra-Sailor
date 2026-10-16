import { resolveApiUrl } from "@/lib/api/browser-client";
import type { CheckoutOffer, LiveMethod, PaymentMethod } from "@/lib/billing/checkout";

/**
 * The product app's billing calls, all to the gateway — the one business API
 * (ADR 2026-09-24 §6). The session cookie travels on the same origin: the
 * gateway is mounted at /api in embedded mode, and the Vite dev server proxies
 * /api to it in the local preview.
 *
 * The gateway prices and locks every order and decides the payment rail
 * (`detectProvider`: Creem for cards, WeChat Pay / Alipay first under
 * NEBUTRA_LOCALE=cn). Nothing here can change what is charged.
 */

export interface SelfServiceOffer extends CheckoutOffer {
  account: "personal" | "organization" | "workspace";
  /** The fulfillment type: "membership" for a plan period, "credits" for a pack. */
  kind: string;
  grants: {
    credits?: number;
    tier?: string;
    days?: number;
    monthlyCredits?: number;
    expiresInDays?: number;
  };
}

export interface BillingSelfService {
  provider: string;
  status: "disabled" | "degraded" | "ready";
  title: string;
  description: string;
  missing: string[];
  methods: LiveMethod[];
  product: string;
  plan: { tier: string; product: string; endsAt: string } | null;
  offers: SelfServiceOffer[];
}

export interface StartedOrder {
  orderId: string;
  kind: "redirect" | "qr";
  url: string;
  amountMinor: number;
  currency: string;
}

export interface OrderStatus {
  id: string;
  status: "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "EXPIRED";
  fulfilled: boolean;
}

/** A gateway answer that is not 2xx, with its status for the page to explain. */
export class BillingRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BillingRequestError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new BillingRequestError(response.status, body?.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

export function getBillingSelfService(product = "app"): Promise<BillingSelfService> {
  return call<BillingSelfService>(
    `/api/v1/billing/self-service?product=${encodeURIComponent(product)}`,
  );
}

/** Where the buyer lands after paying: back on /billing, with the order to verify. */
export function billingReturnUrls(origin: string): { successUrl: string; cancelUrl: string } {
  const back = new URL("/billing", origin);
  const cancelUrl = back.toString();
  back.searchParams.set("paid", "1");
  return { successUrl: back.toString(), cancelUrl };
}

export function startOrder(input: {
  offerId: string;
  method: PaymentMethod;
  channel: "qr" | "h5";
  origin: string;
}): Promise<StartedOrder> {
  return call<StartedOrder>("/api/v1/billing/orders", {
    method: "POST",
    body: JSON.stringify({
      offerId: input.offerId,
      method: input.method,
      channel: input.channel,
      ...billingReturnUrls(input.origin),
    }),
  });
}

export function getOrder(orderId: string): Promise<OrderStatus> {
  return call<OrderStatus>(`/api/v1/billing/orders/${encodeURIComponent(orderId)}`);
}

/** Back from Creem: ask the gateway to check this order with Creem and settle it if paid. */
export function verifyOrder(orderId: string): Promise<OrderStatus> {
  return call<OrderStatus>(`/api/v1/billing/orders/${encodeURIComponent(orderId)}/verify`, {
    method: "POST",
  });
}

const ORDER_KEY = "billing:pending-order";

export function rememberPendingOrder(orderId: string | null): void {
  try {
    if (orderId) window.sessionStorage.setItem(ORDER_KEY, orderId);
    else window.sessionStorage.removeItem(ORDER_KEY);
  } catch {
    // Private mode: the return falls back to Creem's request_id.
  }
}

/**
 * The order the buyer just paid for, on the return from a payment page. Creem
 * appends our order id as `request_id`; the session copy covers a provider
 * that does not.
 */
export function readReturnedOrder(search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.get("paid") !== "1") return null;
  const fromProvider = params.get("request_id");
  if (fromProvider && /^[A-Za-z0-9_-]{1,64}$/.test(fromProvider)) return fromProvider;
  try {
    return window.sessionStorage.getItem(ORDER_KEY);
  } catch {
    return null;
  }
}
