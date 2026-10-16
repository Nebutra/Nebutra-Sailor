// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingSelfService } from "../billing-checkout-api";
import { billingReturnUrls, readReturnedOrder } from "../billing-checkout-api";
import {
  ActivePlanCard,
  BillingProviderNotice,
  buildBillingSelfServiceModel,
} from "../billing-self-service";
import { CheckoutReturnNotice, OfferCheckoutGrid } from "../offer-checkout";

/**
 * The scaffold's /billing page against a mocked gateway: the readiness copy
 * with no keys, a Creem card checkout that redirects to Creem's hosted page,
 * and the return from Creem that verifies the order.
 */

const OFFERS: BillingSelfService["offers"] = [
  {
    id: "plan_pro_monthly",
    product: "app",
    account: "organization",
    kind: "membership",
    grants: { tier: "PRO", days: 30, monthlyCredits: 0 },
    name: "Pro — 1 month",
    prices: { USD: 29, CNY: 198 },
  },
  {
    id: "credits_10k",
    product: "app",
    account: "organization",
    kind: "credits",
    grants: { credits: 10_000 },
    name: "10,000 credits",
    prices: { USD: 10, CNY: 68 },
  },
];

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const fetchMock = vi.fn();
const assignMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  assignMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, origin: "http://localhost:3001", assign: assignMock, search: "" },
  });
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("billing page with no payment keys", () => {
  it("shows the readiness copy, the free plan and offers that cannot be bought yet", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      readiness: {
        provider: "manual",
        status: "degraded",
        title: "Payments are not switched on yet",
        description: "Add CREEM_API_KEY and CREEM_PRODUCT_ID to .env.local …",
      },
    });
    render(
      wrap(
        <>
          <BillingProviderNotice model={model} />
          <ActivePlanCard model={model} />
          <OfferCheckoutGrid offers={OFFERS} methods={[]} />
        </>,
      ),
    );

    expect(screen.getByText("Payments are not switched on yet")).toBeInTheDocument();
    expect(screen.getByText(/CREEM_API_KEY/)).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro — 1 month")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Pay" })) {
      expect(button).toBeDisabled();
    }
  });
});

describe("card checkout through Creem", () => {
  it("creates the order at the gateway and sends the buyer to Creem", async () => {
    fetchMock.mockImplementation(() =>
      json({
        orderId: "order_1",
        kind: "redirect",
        url: "https://checkout.creem.io/ch_1",
        amountMinor: 2900,
        currency: "USD",
      }),
    );
    render(wrap(<OfferCheckoutGrid offers={OFFERS} methods={[{ id: "card", currency: "USD" }]} />));

    fireEvent.click(screen.getByRole("button", { name: /Card · Pay \$29\.00/ }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("https://checkout.creem.io/ch_1"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/billing/orders");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(String(init.body))).toEqual({
      offerId: "plan_pro_monthly",
      method: "card",
      channel: "qr",
      successUrl: "http://localhost:3001/billing?paid=1",
      cancelUrl: "http://localhost:3001/billing",
    });
    expect(window.sessionStorage.getItem("billing:pending-order")).toBe("order_1");
  });

  it("lists wallets first when the gateway does (NEBUTRA_LOCALE=cn)", () => {
    render(
      wrap(
        <OfferCheckoutGrid
          offers={OFFERS.slice(1)}
          methods={[
            { id: "wechat", currency: "CNY" },
            { id: "card", currency: "USD" },
          ]}
        />,
      ),
    );
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels[0]).toMatch(/^WeChat Pay · Pay/);
    expect(labels[1]).toMatch(/^Card · Pay \$10\.00/);
  });

  it("explains a refused purchase instead of failing silently", async () => {
    fetchMock.mockImplementation(() => json({ error: "Forbidden" }, 403));
    render(wrap(<OfferCheckoutGrid offers={OFFERS} methods={[{ id: "card", currency: "USD" }]} />));

    fireEvent.click(screen.getByRole("button", { name: /Card · Pay \$29\.00/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only an owner, admin or billing admin of this organization can pay.",
    );
    expect(assignMock).not.toHaveBeenCalled();
  });
});

describe("the return from Creem", () => {
  it("reads the order Creem hands back as request_id", () => {
    expect(readReturnedOrder("?paid=1&request_id=order_9&checkout_id=ch_1")).toBe("order_9");
    expect(readReturnedOrder("?request_id=order_9")).toBeNull();
    expect(billingReturnUrls("http://localhost:3001").successUrl).toBe(
      "http://localhost:3001/billing?paid=1",
    );
  });

  it("verifies the order with the gateway and confirms the payment", async () => {
    fetchMock.mockImplementation(() =>
      json({ id: "order_9", status: "PAID", fulfilled: true, amountMinor: 2900, currency: "USD" }),
    );
    render(wrap(<CheckoutReturnNotice orderId="order_9" />));

    expect(await screen.findByText("Payment received")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/billing/orders/order_9/verify");
    expect(init.method).toBe("POST");
  });

  it("keeps confirming while the order is still pending", async () => {
    fetchMock.mockImplementation(() =>
      json({
        id: "order_9",
        status: "PENDING",
        fulfilled: false,
        amountMinor: 2900,
        currency: "USD",
      }),
    );
    render(wrap(<CheckoutReturnNotice orderId="order_9" />));

    expect(await screen.findByText("Confirming your payment")).toBeInTheDocument();
  });
});
