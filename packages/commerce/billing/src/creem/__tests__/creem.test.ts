import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCreemCheckout,
  getCreemCheckout,
  isCreemConfigured,
  refundCreemOrder,
  verifyCreemSignature,
} from "../index";

const SECRET = "whsec_test_secret";

type Call = { url: string; init: RequestInit };

function recorder(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

beforeEach(() => {
  vi.stubEnv("CREEM_API_KEY", "creem_key");
  vi.stubEnv("CREEM_PRODUCT_ID", "prod_onetime");
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("CREEM_TEST_MODE", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("needs both the key and the one-time product", () => {
    expect(isCreemConfigured({ CREEM_API_KEY: "k", CREEM_PRODUCT_ID: "p" })).toBe(true);
    expect(isCreemConfigured({ CREEM_API_KEY: "k" })).toBe(false);
  });
});

describe("createCreemCheckout", () => {
  it("opens a checkout on the one product with the order's price and id", async () => {
    const { calls, fetchImpl } = recorder([
      { body: { id: "ch_1", checkout_url: "https://checkout.creem.io/ch_1", status: "pending" } },
    ]);

    const checkout = await createCreemCheckout(
      {
        requestId: "order_1",
        customPriceMinor: 1000,
        successUrl: "https://app.example.com/ok",
        customerEmail: "a@example.com",
        metadata: { paymentOrderId: "order_1" },
      },
      fetchImpl,
    );

    expect(checkout.checkout_url).toBe("https://checkout.creem.io/ch_1");
    const [call] = calls;
    expect(call?.url).toBe("https://test-api.creem.io/v1/checkouts");
    expect((call?.init.headers as Record<string, string>)["x-api-key"]).toBe("creem_key");
    expect(JSON.parse(String(call?.init.body))).toEqual({
      product_id: "prod_onetime",
      request_id: "order_1",
      custom_price: 1000,
      success_url: "https://app.example.com/ok",
      customer: { email: "a@example.com" },
      metadata: { paymentOrderId: "order_1" },
    });
  });

  it("uses the live API outside test mode", async () => {
    vi.stubEnv("CREEM_TEST_MODE", "");
    const { calls, fetchImpl } = recorder([
      { body: { id: "ch_1", checkout_url: "u", status: "pending" } },
    ]);
    await createCreemCheckout(
      { requestId: "o", customPriceMinor: 100, successUrl: "https://x/ok" },
      fetchImpl,
    );
    expect(calls[0]?.url).toBe("https://api.creem.io/v1/checkouts");
  });

  it("refuses a price below Creem's minimum before calling it", async () => {
    const { calls, fetchImpl } = recorder([]);
    await expect(
      createCreemCheckout(
        { requestId: "o", customPriceMinor: 99, successUrl: "https://x/ok" },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ code: "CREEM_PRICE_OUT_OF_RANGE" });
    expect(calls).toHaveLength(0);
  });

  it("surfaces Creem's error message", async () => {
    const { fetchImpl } = recorder([{ status: 400, body: { message: ["product_id must exist"] } }]);
    await expect(
      createCreemCheckout(
        { requestId: "o", customPriceMinor: 1000, successUrl: "https://x/ok" },
        fetchImpl,
      ),
    ).rejects.toThrow(/product_id must exist/);
  });
});

describe("getCreemCheckout", () => {
  it("looks a checkout up by id", async () => {
    const { calls, fetchImpl } = recorder([
      {
        body: {
          status: "completed",
          order: { id: "ord_1", amount: 1000, currency: "USD", status: "paid" },
        },
      },
    ]);
    const checkout = await getCreemCheckout("ch_1", fetchImpl);
    expect(calls[0]?.url).toBe("https://test-api.creem.io/v1/checkouts?checkout_id=ch_1");
    expect(checkout.order?.id).toBe("ord_1");
  });
});

describe("refundCreemOrder", () => {
  it("finds the order's transaction, then refunds it in full", async () => {
    const { calls, fetchImpl } = recorder([
      { body: { items: [{ id: "tran_1", status: "paid" }] } },
      { body: { status: "succeeded" } },
    ]);

    const result = await refundCreemOrder("ord_1", fetchImpl);

    expect(calls[0]?.url).toBe("https://test-api.creem.io/v1/transactions/search?order_id=ord_1");
    expect(calls[1]?.url).toBe("https://test-api.creem.io/v1/refunds");
    expect(JSON.parse(String(calls[1]?.init.body))).toEqual({ transaction_id: "tran_1" });
    expect(result.status).toBe("succeeded");
  });

  it("does not refund twice — a refunded transaction is already done", async () => {
    const { calls, fetchImpl } = recorder([
      { body: { items: [{ id: "tran_1", status: "refunded" }] } },
    ]);
    expect((await refundCreemOrder("ord_1", fetchImpl)).status).toBe("succeeded");
    expect(calls).toHaveLength(1);
  });

  it("reports a pending refund as processing", async () => {
    const { fetchImpl } = recorder([
      { body: { items: [{ id: "tran_1", status: "paid" }] } },
      { body: { status: "pending" } },
    ]);
    expect((await refundCreemOrder("ord_1", fetchImpl)).status).toBe("processing");
  });

  it("refuses when Creem has no transaction for the order", async () => {
    const { fetchImpl } = recorder([{ body: { items: [] } }]);
    await expect(refundCreemOrder("ord_x", fetchImpl)).rejects.toMatchObject({
      code: "CREEM_TRANSACTION_NOT_FOUND",
    });
  });
});

describe("verifyCreemSignature", () => {
  const body = JSON.stringify({ id: "evt_1", eventType: "checkout.completed" });
  const sign = (payload: string, secret = SECRET) =>
    createHmac("sha256", secret).update(payload).digest("hex");

  it("accepts the hex HMAC-SHA256 of the raw body", () => {
    expect(verifyCreemSignature(body, sign(body))).toBe(true);
  });

  it("rejects a body changed after signing", () => {
    expect(verifyCreemSignature(`${body} `, sign(body))).toBe(false);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyCreemSignature(body, sign(body, "someone_else"))).toBe(false);
  });

  it("rejects when there is no signature or no secret", () => {
    expect(verifyCreemSignature(body, null)).toBe(false);
    expect(verifyCreemSignature(body, sign(body), null)).toBe(false);
  });
});
