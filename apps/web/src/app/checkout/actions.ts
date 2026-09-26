"use server";

import { headers } from "next/headers";
import { getAuthenticatedApi } from "@/lib/api";
import { type PaymentMethod, resolveReturnTo, walletChannel } from "@/lib/billing/checkout";

/**
 * Checkout's two calls to the payment API, made server-side so the buyer's
 * session travels as a signed service token, never as a browser credential to
 * another origin. The gateway prices and locks every order; nothing here can
 * change what is charged.
 */

export interface StartedCheckout {
  orderId: string;
  kind: "redirect" | "qr";
  url: string;
  amountMinor: number;
  currency: string;
}

export type StartCheckoutResult =
  | { ok: true; checkout: StartedCheckout }
  | { ok: false; error: "forbidden" | "unavailable" | "rejected" };

function appOrigin(): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) throw new Error("APP_URL is not set; checkout cannot name its return page");
  return new URL(configured).origin;
}

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status)
    : undefined;
}

export async function startCheckout(input: {
  offerId: string;
  method: PaymentMethod;
  amount?: number;
  returnTo?: string | null;
}): Promise<StartCheckoutResult> {
  const back = new URL("/checkout", appOrigin());
  back.searchParams.set("offer", input.offerId);
  const returnTo = resolveReturnTo(input.returnTo);
  if (returnTo) back.searchParams.set("returnTo", returnTo);
  const cancelUrl = back.toString();
  back.searchParams.set("paid", "1");

  const channel = walletChannel((await headers()).get("user-agent"));

  try {
    const api = await getAuthenticatedApi();
    const checkout = await api.post<StartedCheckout>("/api/v1/billing/orders", {
      offerId: input.offerId,
      method: input.method,
      channel,
      ...(input.amount === undefined ? {} : { amount: input.amount }),
      successUrl: back.toString(),
      cancelUrl,
    });
    return { ok: true, checkout };
  } catch (error) {
    const status = statusOf(error);
    if (status === 401 || status === 403) return { ok: false, error: "forbidden" };
    if (status === 400) return { ok: false, error: "rejected" };
    return { ok: false, error: "unavailable" };
  }
}

export interface OrderState {
  status: "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "EXPIRED";
  fulfilled: boolean;
}

/** One poll of an order. `null` when it cannot be read right now; the page keeps trying. */
export async function readOrder(orderId: string): Promise<OrderState | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) return null;
  try {
    const api = await getAuthenticatedApi();
    const order = await api.get<OrderState>(`/api/v1/billing/orders/${orderId}`);
    return { status: order.status, fulfilled: order.fulfilled };
  } catch {
    return null;
  }
}
