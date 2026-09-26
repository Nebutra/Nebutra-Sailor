import { brand } from "@nebutra/brand/metadata";
import { describe, expect, it } from "vitest";
import {
  type CheckoutOffer,
  defaultMethod,
  type LiveMethod,
  methodsFor,
  parseAmount,
  productName,
  resolveReturnTo,
  walletChannel,
} from "../checkout";

const ROOT = brand.domains.landing.replace(/^www\./, "");
const PRODUCT = `https://${brand.domains.router}/wallet`;

const LIVE: LiveMethod[] = [
  { id: "card", currency: "USD" },
  { id: "alipay", currency: "CNY" },
  { id: "wechat", currency: "CNY" },
];

const TOPUP: CheckoutOffer = {
  id: "router_topup",
  product: "router",
  name: "Router balance",
  customAmount: { USD: { min: 5, max: 10_000 }, CNY: { min: 50, max: 70_000 } },
};

describe("resolveReturnTo", () => {
  it("accepts a first-party product page and a path on this app", () => {
    expect(resolveReturnTo(PRODUCT)).toBe(PRODUCT);
    expect(resolveReturnTo(`https://${ROOT}/`)).toBe(`https://${ROOT}/`);
    expect(resolveReturnTo("/billing")).toBe("/billing");
  });

  it.each([
    ["another site", "https://evil.example/wallet"],
    ["a look-alike suffix", `https://${brand.domains.router}.evil.example/`],
    ["a look-alike prefix", `https://evil${ROOT}/`],
    ["plain http", PRODUCT.replace("https:", "http:")],
    ["credentials in the URL", `https://user:pw@${brand.domains.router}/`],
    ["a protocol-relative path", "//evil.example/x"],
    ["a backslash path", "/\\evil.example"],
    ["a script URL", "javascript:alert(1)"],
    ["nonsense", "not a url"],
  ])("refuses %s, so checkout is no open redirect", (_why, value) => {
    expect(resolveReturnTo(value)).toBeNull();
  });
});

describe("paying", () => {
  it("offers only the live methods whose currency the offer is priced in", () => {
    const usdOnly = { ...TOPUP, customAmount: { USD: { min: 5, max: 100 } } };
    expect(methodsFor(usdOnly, LIVE).map((m) => m.id)).toEqual(["card"]);
    expect(methodsFor(TOPUP, LIVE)).toHaveLength(3);
  });

  it("puts the wallets first for a Chinese reader and the card first otherwise", () => {
    expect(defaultMethod(LIVE, "zh-Hans")).toBe("alipay");
    expect(defaultMethod(LIVE, "en")).toBe("card");
    expect(defaultMethod([{ id: "wechat", currency: "CNY" }], "en")).toBe("wechat");
    expect(defaultMethod([], "en")).toBeUndefined();
  });

  it("pays in the wallet app on a phone and by QR code on a desktop", () => {
    expect(walletChannel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("h5");
    expect(walletChannel("Mozilla/5.0 (Linux; Android 15) Mobile")).toBe("h5");
    expect(walletChannel("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)")).toBe("qr");
    expect(walletChannel(null)).toBe("qr");
  });

  it("takes an amount inside the range with at most two decimals", () => {
    const range = { min: 5, max: 100 };
    expect(parseAmount("12.5", range)).toEqual({ ok: true, value: 12.5 });
    expect(parseAmount(" 100 ", range)).toEqual({ ok: true, value: 100 });
    expect(parseAmount("4.99", range)).toEqual({ ok: false, reason: "range" });
    expect(parseAmount("1.005", range)).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("", range)).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("-5", range)).toEqual({ ok: false, reason: "invalid" });
  });

  it("names products as written, in every language", () => {
    expect(productName("kuanlan")).toBe("观澜 Kuanlan");
    expect(productName("router")).toBe("Router");
  });
});
