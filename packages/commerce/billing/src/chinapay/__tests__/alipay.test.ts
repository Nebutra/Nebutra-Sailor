import { createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AlipayNotificationFields,
  buildAlipayWapPayUrl,
  createAlipayPrecreateOrder,
  queryAlipayOrder,
  refundAlipayOrder,
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

describe("Alipay app_id check", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initTestConfig();
  });

  afterEach(() => {
    resetChinaPayConfig();
  });

  it("rejects a correctly signed notification addressed to another app", () => {
    const fields: AlipayNotificationFields = {
      app_id: "2021999999999999",
      trade_status: "TRADE_SUCCESS",
      out_trade_no: "credit_1000_org_1",
    };
    fields.sign = signAsAlipay(fields as Record<string, string>);

    expect(verifyAlipayNotification(fields)).toBe(false);
  });
});

describe("Alipay mobile website pay and refund", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initTestConfig();
  });

  afterEach(() => {
    resetChinaPayConfig();
    vi.unstubAllGlobals();
  });

  it("builds a signed trade.wap.pay gateway URL the merchant key verifies", () => {
    const { payUrl } = buildAlipayWapPayUrl({
      outTradeNo: "order_1",
      subject: "10000 Credits",
      totalAmount: "68.00",
      returnUrl: "https://pay.example.com/checkout-return",
      quitUrl: "https://pay.example.com/billing",
    });

    const url = new URL(payUrl);
    expect(url.origin + url.pathname).toBe(getAlipayConfig().gatewayUrl);
    const params = Object.fromEntries(url.searchParams);
    expect(params.method).toBe("alipay.trade.wap.pay");
    expect(params.return_url).toBe("https://pay.example.com/checkout-return");
    expect(JSON.parse(params.biz_content ?? "{}")).toMatchObject({
      product_code: "QUICK_WAP_WAY",
      total_amount: "68.00",
      quit_url: "https://pay.example.com/billing",
    });

    const { sign, ...rest } = params;
    const content = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join("&");
    expect(
      createVerify("RSA-SHA256")
        .update(content, "utf8")
        .verify(merchant.publicKey, sign ?? "", "base64"),
    ).toBe(true);
  });

  it("refunds and treats code 10000 as success", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            alipay_trade_refund_response: { code: "10000", msg: "Success", fund_change: "Y" },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refundAlipayOrder({
      outTradeNo: "order_1",
      outRequestNo: "refund_1",
      refundAmount: "34.00",
    });

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const params = new URLSearchParams(String(init.body));
    expect(params.get("method")).toBe("alipay.trade.refund");
    expect(JSON.parse(params.get("biz_content") ?? "{}")).toMatchObject({
      out_request_no: "refund_1",
      refund_amount: "34.00",
    });
    expect(result.status).toBe("succeeded");
  });

  it("throws when Alipay rejects the refund", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              alipay_trade_refund_response: { code: "40004", sub_msg: "交易不存在" },
            }),
            { status: 200 },
          ),
      ),
    );

    await expect(
      refundAlipayOrder({ outTradeNo: "nope", outRequestNo: "r", refundAmount: "1.00" }),
    ).rejects.toThrow(/交易不存在/);
  });
});
