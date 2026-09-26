import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  acceptWebhookEventMock,
  markFailedMock,
  markProcessedMock,
  settlePaymentOrderMock,
  verifyMock,
} = vi.hoisted(() => ({
  acceptWebhookEventMock: vi.fn(),
  markFailedMock: vi.fn(),
  markProcessedMock: vi.fn(),
  settlePaymentOrderMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));

vi.mock("@nebutra/repositories", () => ({
  acceptWebhookEvent: (...args: unknown[]) => acceptWebhookEventMock(...args),
  WebhookEventRepository: class WebhookEventRepository {
    markFailed = (...args: unknown[]) => markFailedMock(...args);
    markProcessed = (...args: unknown[]) => markProcessedMock(...args);
  },
}));

vi.mock("@nebutra/billing", () => ({
  PAYMENT_ORDER_METADATA_KEY: "paymentOrderId",
  settlePaymentOrder: (...args: unknown[]) => settlePaymentOrderMock(...args),
  verifyCreemSignature: (...args: unknown[]) => verifyMock(...args),
}));

import { creemWebhookRoutes } from "../routes/webhooks/creem.js";

const completed = {
  id: "evt_1",
  eventType: "checkout.completed",
  created_at: 1,
  object: {
    id: "ch_1",
    request_id: "order_1",
    // Creem adds tax as merchant of record; `amount` is before tax.
    order: { id: "ord_1", amount: 1000, currency: "USD", status: "paid" },
  },
};

function post(body: unknown, signature = "sig") {
  return creemWebhookRoutes.request("/creem", {
    method: "POST",
    headers: { "content-type": "application/json", "creem-signature": signature },
    body: JSON.stringify(body),
  });
}

describe("POST /creem", () => {
  beforeEach(() => {
    for (const m of [
      acceptWebhookEventMock,
      markFailedMock,
      markProcessedMock,
      settlePaymentOrderMock,
      verifyMock,
    ]) {
      m.mockReset();
    }
    verifyMock.mockReturnValue(true);
    acceptWebhookEventMock.mockResolvedValue({ outcome: "process" });
    markProcessedMock.mockResolvedValue({});
    markFailedMock.mockResolvedValue({});
    settlePaymentOrderMock.mockResolvedValue("settled");
  });

  it("verifies the raw body, not a re-serialised one", async () => {
    const raw = JSON.stringify(completed);
    await creemWebhookRoutes.request("/creem", {
      method: "POST",
      headers: { "content-type": "application/json", "creem-signature": "sig" },
      body: raw,
    });
    expect(verifyMock).toHaveBeenCalledWith(raw, "sig");
  });

  it("refuses a bad signature before touching the inbox", async () => {
    verifyMock.mockReturnValue(false);
    const res = await post(completed, "forged");
    expect(res.status).toBe(401);
    expect(acceptWebhookEventMock).not.toHaveBeenCalled();
    expect(settlePaymentOrderMock).not.toHaveBeenCalled();
  });

  it("settles the order a completed checkout names, at the pre-tax amount", async () => {
    const res = await post(completed);
    expect(res.status).toBe(200);
    expect(settlePaymentOrderMock).toHaveBeenCalledWith({
      orderId: "order_1",
      paidMinor: 1000,
      currency: "USD",
      providerRef: "ord_1",
    });
    expect(markProcessedMock).toHaveBeenCalledWith("creem", "evt_1");
  });

  it("falls back to metadata when request_id is absent", async () => {
    await post({
      ...completed,
      object: {
        ...completed.object,
        request_id: undefined,
        metadata: { paymentOrderId: "order_9" },
      },
    });
    expect(settlePaymentOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order_9" }),
    );
  });

  it("acknowledges a redelivery without settling again", async () => {
    acceptWebhookEventMock.mockResolvedValue({ outcome: "skip_processed" });
    const res = await post(completed);
    expect(res.status).toBe(200);
    expect(settlePaymentOrderMock).not.toHaveBeenCalled();
  });

  it("acknowledges an unknown order rather than retrying forever", async () => {
    settlePaymentOrderMock.mockResolvedValue("not_found");
    const res = await post(completed);
    expect(res.status).toBe(200);
    expect(markProcessedMock).toHaveBeenCalled();
  });

  it("asks Creem to retry when settling fails", async () => {
    settlePaymentOrderMock.mockRejectedValue(new Error("db down"));
    const res = await post(completed);
    expect(res.status).toBe(500);
    expect(markFailedMock).toHaveBeenCalledWith("creem", "evt_1", "db down");
  });

  it("ignores events it does not act on, and still acknowledges them", async () => {
    const res = await post({ ...completed, id: "evt_2", eventType: "subscription.paid" });
    expect(res.status).toBe(200);
    expect(settlePaymentOrderMock).not.toHaveBeenCalled();
  });
});
