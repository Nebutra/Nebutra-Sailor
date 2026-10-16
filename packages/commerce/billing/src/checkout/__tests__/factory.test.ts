import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectProvider, getCheckout, isChinaPayConfigured } from "../factory";

const KEYS = [
  "BILLING_PROVIDER",
  "STRIPE_SECRET_KEY",
  "CREEM_API_KEY",
  "CREEM_PRODUCT_ID",
  "ALIPAY_APP_ID",
  "WECHATPAY_MCHID",
  "NEBUTRA_LOCALE",
  "NEXT_PUBLIC_NEBUTRA_LOCALE",
  "NEBUTRA_REGION",
  "NEXT_PUBLIC_REGION",
] as const;

function clearEnv() {
  for (const key of KEYS) vi.stubEnv(key, "");
}

function creem() {
  vi.stubEnv("CREEM_API_KEY", "creem_test_123");
  vi.stubEnv("CREEM_PRODUCT_ID", "prod_123");
}

describe("detectProvider", () => {
  beforeEach(clearEnv);
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 'manual' when no relevant env vars are set", () => {
    expect(detectProvider()).toBe("manual");
  });

  it("returns 'creem' when Creem is configured — the card rail (ADR 2026-09-26)", () => {
    creem();
    expect(detectProvider()).toBe("creem");
  });

  it("needs both Creem keys", () => {
    vi.stubEnv("CREEM_API_KEY", "creem_test_123");
    expect(detectProvider()).toBe("manual");
  });

  it("never auto-detects the legacy Stripe adapter from STRIPE_SECRET_KEY", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(detectProvider()).toBe("manual");
    creem();
    expect(detectProvider()).toBe("creem");
  });

  it("returns 'chinapay' when only WECHATPAY_MCHID is set", () => {
    vi.stubEnv("WECHATPAY_MCHID", "1900000109");
    expect(detectProvider()).toBe("chinapay");
  });

  it("returns 'chinapay' when only ALIPAY_APP_ID is set", () => {
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("chinapay");
  });

  it("prefers Creem over the wallets outside mainland China", () => {
    creem();
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("creem");
  });

  it("prefers WeChat Pay / Alipay under NEBUTRA_LOCALE=cn", () => {
    creem();
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    vi.stubEnv("NEBUTRA_LOCALE", "cn");
    expect(detectProvider()).toBe("chinapay");
  });

  it("honours the NEBUTRA_REGION alias", () => {
    creem();
    vi.stubEnv("WECHATPAY_MCHID", "1900000109");
    vi.stubEnv("NEBUTRA_REGION", "cn-mainland");
    expect(detectProvider()).toBe("chinapay");
  });

  it("falls back to Creem under cn when no wallet is configured", () => {
    creem();
    vi.stubEnv("NEBUTRA_LOCALE", "cn");
    expect(detectProvider()).toBe("creem");
  });

  it("reads an env passed in instead of process.env", () => {
    expect(detectProvider({ CREEM_API_KEY: "k", CREEM_PRODUCT_ID: "p" })).toBe("creem");
    expect(
      detectProvider({
        CREEM_API_KEY: "k",
        CREEM_PRODUCT_ID: "p",
        WECHATPAY_MCHID: "1900000109",
        NEBUTRA_LOCALE: "cn",
      }),
    ).toBe("chinapay");
  });

  it("prioritizes BILLING_PROVIDER env var over auto-detection", () => {
    creem();
    vi.stubEnv("BILLING_PROVIDER", "chinapay");
    expect(detectProvider()).toBe("chinapay");
  });

  it("selects the legacy Stripe adapter only when BILLING_PROVIDER=stripe", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    expect(detectProvider()).toBe("stripe");
  });

  it("respects BILLING_PROVIDER=manual even when other creds are available", () => {
    vi.stubEnv("BILLING_PROVIDER", "manual");
    creem();
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("manual");
  });
});

describe("getCheckout", () => {
  beforeEach(clearEnv);
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ManualCheckoutProvider when provider is 'manual'", async () => {
    const checkout = await getCheckout({ provider: "manual" });
    expect(checkout.name).toBe("manual");
  });

  it("auto-detects manual provider when no env vars are set", async () => {
    const checkout = await getCheckout();
    expect(checkout.name).toBe("manual");
  });

  it("auto-detects Creem when it is configured", async () => {
    creem();
    const checkout = await getCheckout();
    expect(checkout.name).toBe("creem");
  });

  it("explicit config overrides env detection", async () => {
    creem();
    const checkout = await getCheckout({ provider: "manual" });
    expect(checkout.name).toBe("manual");
  });
});

describe("isChinaPayConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers per wallet", () => {
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    vi.stubEnv("WECHATPAY_MCHID", "");
    expect(isChinaPayConfigured("alipay")).toBe(true);
    expect(isChinaPayConfigured("wechat")).toBe(false);
    expect(isChinaPayConfigured()).toBe(true);
  });
});
