import { afterEach, describe, expect, it, vi } from "vitest";
import { detectProvider, getCheckout, isChinaPayConfigured } from "../factory";

describe("detectProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 'manual' when no relevant env vars are set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("ALIPAY_APP_ID", "");
    vi.stubEnv("WECHATPAY_MCHID", "");
    expect(detectProvider()).toBe("manual");
  });

  it("returns 'stripe' when STRIPE_SECRET_KEY is set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("ALIPAY_APP_ID", "");
    vi.stubEnv("WECHATPAY_MCHID", "");
    expect(detectProvider()).toBe("stripe");
  });

  it("returns 'chinapay' when only WECHATPAY_MCHID is set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("ALIPAY_APP_ID", "");
    vi.stubEnv("WECHATPAY_MCHID", "1900000109");
    expect(detectProvider()).toBe("chinapay");
  });

  it("returns 'chinapay' when only ALIPAY_APP_ID is set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("chinapay");
  });

  it("prefers STRIPE_SECRET_KEY when multiple are set (precedence order)", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("stripe");
  });

  it("prioritizes BILLING_PROVIDER env var over auto-detection", () => {
    vi.stubEnv("BILLING_PROVIDER", "chinapay");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(detectProvider()).toBe("chinapay");
  });

  it("respects BILLING_PROVIDER=manual even when other creds are available", () => {
    vi.stubEnv("BILLING_PROVIDER", "manual");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    expect(detectProvider()).toBe("manual");
  });
});

describe("getCheckout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ManualCheckoutProvider when provider is 'manual'", async () => {
    const checkout = await getCheckout({ provider: "manual" });
    expect(checkout.name).toBe("manual");
  });

  it("auto-detects manual provider when no env vars are set", async () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("ALIPAY_APP_ID", "");
    vi.stubEnv("WECHATPAY_MCHID", "");
    const checkout = await getCheckout();
    expect(checkout.name).toBe("manual");
  });

  it("explicit config overrides env detection", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
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
