import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AlipayNotificationFields,
  createAlipayPrecreateOrder,
  queryAlipayOrder,
  verifyAlipayNotification,
} from "../alipay";
import { getAlipayConfig, initAlipay, resetChinaPayConfig } from "../client";

// Alipay's own key (used to sign the notifications the merchant verifies)
// is deliberately distinct from any merchant application key — the merchant
// private key never appears in this test file at all, only Alipay's public
// key, matching what a real integration configures.
const alipay = generateKeyPairSync("rsa", { modulusLength: 2048 });
const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });

function initTestConfig() {
  initAlipay({
    appId: "2021000000000000",
    privateKey: merchant.privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    alipayPublicKey: alipay.publicKey.export({ type: "spki", format: "pem" }).toString(),
    notifyUrl: "https://api.example.com/api/webhooks/chinapay/alipay",
    sandbox: true,
  });
}

function signAsAlipay(fields: Record<string, string>): string {
  const content = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
  return createSign("RSA-SHA256").update(content, "utf8").sign(alipay.privateKey, "base64");
}

describe("Alipay async notification verification", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initTestConfig();
  });

  afterEach(() => {
    resetChinaPayConfig();
    vi.unstubAllGlobals();
  });

  it("accepts a notification signed with Alipay's private key", () => {
    const fields: AlipayNotificationFields = {
      trade_status: "TRADE_SUCCESS",
      out_trade_no: "credit_1000_org_1",
      trade_no: "2026090322001",
      total_amount: "9.90",
      passback_params: encodeURIComponent(
        JSON.stringify({ t: "credit_purchase", o: "org_1", c: "1000" }),
      ),
    };
    fields.sign = signAsAlipay(fields as Record<string, string>);

    expect(verifyAlipayNotification(fields)).toBe(true);
  });

  it("rejects a notification with a tampered field", () => {
    const fields: AlipayNotificationFields = {
      trade_status: "TRADE_SUCCESS",
      out_trade_no: "credit_1000_org_1",
      total_amount: "9.90",
    };
    fields.sign = signAsAlipay(fields as Record<string, string>);

    fields.total_amount = "0.01"; // tamper after signing

    expect(verifyAlipayNotification(fields)).toBe(false);
  });

  it("rejects a notification with no sign field", () => {
    expect(verifyAlipayNotification({ trade_status: "TRADE_SUCCESS", out_trade_no: "x" })).toBe(
      false,
    );
  });

  it("rejects a notification signed with a different key", () => {
    const impostor = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const fields: AlipayNotificationFields = { trade_status: "TRADE_SUCCESS", out_trade_no: "x" };
    const content = "out_trade_no=x&trade_status=TRADE_SUCCESS";
    fields.sign = createSign("RSA-SHA256")
      .update(content, "utf8")
      .sign(impostor.privateKey, "base64");

    expect(verifyAlipayNotification(fields)).toBe(false);
  });
});

describe("Alipay order creation", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initTestConfig();
  });

  afterEach(() => {
    resetChinaPayConfig();
    vi.unstubAllGlobals();
  });

  it("uses the sandbox gateway when configured", () => {
    expect(getAlipayConfig().gatewayUrl).toContain("sandbox");
  });

  it("returns qr_code from a successful precreate response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              alipay_trade_precreate_response: {
                code: "10000",
                msg: "Success",
                out_trade_no: "order_1",
                qr_code: "https://qr.alipay.com/abc123",
              },
            }),
            { status: 200 },
          ),
      ),
    );

    const result = await createAlipayPrecreateOrder({
      outTradeNo: "order_1",
      subject: "1000 Credits",
      totalAmount: "9.90",
    });

    expect(result.qrCode).toBe("https://qr.alipay.com/abc123");
  });

  it("throws a BillingError when Alipay rejects the order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              alipay_trade_precreate_response: {
                code: "40004",
                msg: "Business Failed",
                sub_msg: "余额不足",
              },
            }),
            { status: 200 },
          ),
      ),
    );

    await expect(
      createAlipayPrecreateOrder({ outTradeNo: "order_1", subject: "x", totalAmount: "9.90" }),
    ).rejects.toThrow(/余额不足/);
  });

  it("maps trade_status to a normalized status when querying an order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              alipay_trade_query_response: {
                code: "10000",
                trade_status: "TRADE_SUCCESS",
                total_amount: "9.90",
              },
            }),
            { status: 200 },
          ),
      ),
    );

    const result = await queryAlipayOrder("order_1");
    expect(result).toEqual({ status: "paid", totalAmount: "9.90" });
  });
});
