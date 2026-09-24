import { afterEach, describe, expect, it, vi } from "vitest";
import { detectProvider, getCheckout } from "../factory";

describe("detectProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 'manual' when no relevant env vars are set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("CHINAPAY_APP_ID", "");
    expect(detectProvider()).toBe("manual");
  });

  it("returns 'stripe' when STRIPE_SECRET_KEY is set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("CHINAPAY_APP_ID", "");
    expect(detectProvider()).toBe("stripe");
  });

  it("returns 'chinapay' when only CHINAPAY_APP_ID is set", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("CHINAPAY_APP_ID", "app_123");
    expect(detectProvider()).toBe("chinapay");
  });

  it("prefers STRIPE_SECRET_KEY when multiple are set (precedence order)", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("CHINAPAY_APP_ID", "app_123");
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
    vi.stubEnv("CHINAPAY_APP_ID", "app_123");
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
    vi.stubEnv("CHINAPAY_APP_ID", "");
    const checkout = await getCheckout();
    expect(checkout.name).toBe("manual");
  });

  it("explicit config overrides env detection", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const checkout = await getCheckout({ provider: "manual" });
    expect(checkout.name).toBe("manual");
  });
});
