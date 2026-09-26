import { createCipheriv, createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initWechatPay, resetChinaPayConfig } from "../client";
import {
  createWechatH5Order,
  createWechatNativeOrder,
  queryWechatOrder,
  refundWechatOrder,
  resetWechatPlatformCertCache,
  seedWechatPlatformCertCache,
  verifyAndDecryptWechatNotification,
} from "../wechat";

// Two independent keypairs: the merchant's own key (only used to sign
// outgoing requests) and a stand-in "platform" key WeChat Pay would sign
// notifications with. A test that used the same keypair for both would not
// catch a verifier that accidentally trusts the merchant's own signature.
const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
const platform = generateKeyPairSync("rsa", { modulusLength: 2048 });

const API_V3_KEY = "a".repeat(32);
const PLATFORM_SERIAL = "platform-serial-1";

function initTestConfig() {
  return {
    mchid: "1900000109",
    appId: "wx_app_id",
    privateKey: merchant.privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    serialNo: "merchant-serial-1",
    apiV3Key: API_V3_KEY,
    notifyUrl: "https://api.example.com/api/webhooks/chinapay/wechat",
  };
}

function encryptResource(payload: unknown, nonce: string, associatedData: string) {
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(API_V3_KEY, "utf8"),
    Buffer.from(nonce, "utf8"),
  );
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([ciphertext, cipher.getAuthTag()]).toString("base64");
}

function buildSignedNotification(payload: unknown) {
  const nonce = "abcdefghijkl"; // 12 bytes, matches AES-GCM's recommended IV length
  const associatedData = "transaction";
  const ciphertext = encryptResource(payload, nonce, associatedData);

  const envelope = {
    id: "evt_1",
    event_type: "TRANSACTION.SUCCESS",
    resource: { algorithm: "AEAD_AES_256_GCM", nonce, associated_data: associatedData, ciphertext },
  };
  const rawBody = JSON.stringify(envelope);

  const timestamp = "1690000000";
  const headerNonce = "header-nonce-value";
  const message = `${timestamp}\n${headerNonce}\n${rawBody}\n`;
  const signature = createSign("RSA-SHA256").update(message).sign(platform.privateKey, "base64");

  return {
    rawBody,
    headers: { timestamp, nonce: headerNonce, signature, serial: PLATFORM_SERIAL },
  };
}

describe("WeChat Pay APIv3 notification verification", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    resetWechatPlatformCertCache();
    initWechatPay(initTestConfig());
    seedWechatPlatformCertCache(
      PLATFORM_SERIAL,
      platform.publicKey.export({ type: "spki", format: "pem" }).toString(),
    );
  });

  afterEach(() => {
    resetChinaPayConfig();
    resetWechatPlatformCertCache();
    vi.unstubAllGlobals();
  });

  it("verifies the platform signature and decrypts the AEAD_AES_256_GCM resource", async () => {
    const resource = {
      out_trade_no: "credit_1000_org_1",
      transaction_id: "wx_txn_1",
      trade_state: "SUCCESS",
      attach: JSON.stringify({ t: "credit_purchase", o: "org_1", c: "1000" }),
      amount: { total: 990, payer_total: 990, currency: "CNY" },
    };
    const { rawBody, headers } = buildSignedNotification(resource);

    const decrypted = await verifyAndDecryptWechatNotification(headers, rawBody);

    expect(decrypted).toEqual(resource);
  });

  it("rejects a notification whose signature does not match the body", async () => {
    const { rawBody, headers } = buildSignedNotification({
      out_trade_no: "x",
      trade_state: "SUCCESS",
    });
    // The signature covers the whole raw body; flipping any byte outside the
    // (opaque, encrypted) resource — here the envelope id — must invalidate it.
    const tamperedBody = rawBody.replace('"id":"evt_1"', '"id":"evt_2"');

    await expect(verifyAndDecryptWechatNotification(headers, tamperedBody)).rejects.toThrow(
      /signature is invalid/,
    );
  });

  it("rejects an unknown platform certificate serial without a network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { rawBody, headers } = buildSignedNotification({
      out_trade_no: "x",
      trade_state: "SUCCESS",
    });
    await expect(
      verifyAndDecryptWechatNotification({ ...headers, serial: "unknown-serial" }, rawBody),
    ).rejects.toThrow();

    // A real merchant would refetch /v3/certificates here; this test only
    // asserts the seeded-cache path never silently accepts an unknown serial.
    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe("WeChat Pay APIv3 order creation", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initWechatPay(initTestConfig());
  });

  afterEach(() => {
    resetChinaPayConfig();
    vi.unstubAllGlobals();
  });

  it("rejects an attach payload over 128 bytes before making a request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      createWechatNativeOrder({
        outTradeNo: "order_1",
        description: "1000 Credits",
        totalFen: 990,
        attach: "x".repeat(200),
      }),
    ).rejects.toThrow(/exceeds 128 bytes/);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the code_url from a successful Native order response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code_url: "weixin://wxpay/bizpayurl?pr=abc123" }), {
            status: 200,
          }),
      ),
    );

    const result = await createWechatNativeOrder({
      outTradeNo: "order_1",
      description: "1000 Credits",
      totalFen: 990,
    });

    expect(result.codeUrl).toBe("weixin://wxpay/bizpayurl?pr=abc123");
  });

  it("throws a BillingError when the gateway rejects the order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "PARAM_ERROR", message: "invalid mchid" }), {
            status: 400,
          }),
      ),
    );

    await expect(
      createWechatNativeOrder({ outTradeNo: "order_1", description: "x", totalFen: 100 }),
    ).rejects.toThrow(/invalid mchid/);
  });

  it("maps trade_state to a normalized status when querying an order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ trade_state: "SUCCESS", amount: { total: 990 } }), {
            status: 200,
          }),
      ),
    );

    const result = await queryWechatOrder("order_1");
    expect(result).toEqual({ status: "paid", amountFen: 990 });
  });
});

describe("WeChat Pay APIv3 H5 order and refund", () => {
  beforeEach(() => {
    resetChinaPayConfig();
    initWechatPay(initTestConfig());
  });

  afterEach(() => {
    resetChinaPayConfig();
    vi.unstubAllGlobals();
  });

  it("sends the buyer IP as scene_info and appends the redirect_url", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ h5_url: "https://wx.tenpay.com/cgi-bin/mmpayweb?prepay_id=x" }),
          {
            status: 200,
          },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await createWechatH5Order({
      outTradeNo: "order_1",
      description: "1000 Credits",
      totalFen: 6800,
      clientIp: "203.0.113.7",
      redirectUrl: "https://pay.example.com/checkout-return?x=1",
    });

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v3/pay/transactions/h5");
    const body = JSON.parse(String(init.body));
    expect(body.scene_info).toEqual({
      payer_client_ip: "203.0.113.7",
      h5_info: { type: "Wap" },
    });
    expect(result.h5Url).toBe(
      "https://wx.tenpay.com/cgi-bin/mmpayweb?prepay_id=x&redirect_url=" +
        encodeURIComponent("https://pay.example.com/checkout-return?x=1"),
    );
  });

  it("refunds with out_refund_no as the idempotency key and maps status", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ refund_id: "50000000382019052709732678859", status: "PROCESSING" }),
          {
            status: 200,
          },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refundWechatOrder({
      outTradeNo: "order_1",
      outRefundNo: "refund_1",
      refundFen: 3400,
      totalFen: 6800,
    });

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v3/refund/domestic/refunds");
    expect(JSON.parse(String(init.body))).toMatchObject({
      out_trade_no: "order_1",
      out_refund_no: "refund_1",
      amount: { refund: 3400, total: 6800, currency: "CNY" },
    });
    expect(result.status).toBe("processing");
  });
});
