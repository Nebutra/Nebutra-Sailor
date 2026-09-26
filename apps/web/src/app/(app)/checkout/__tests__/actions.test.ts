import { brand } from "@nebutra/brand/metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, get, userAgent } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  userAgent: { value: "Mozilla/5.0 (Macintosh)" },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": userAgent.value }),
}));
vi.mock("@/lib/api", () => ({
  getAuthenticatedApi: async () => ({ post, get }),
}));

import { readOrder, startCheckout } from "../actions";

const APP = `https://${brand.domains.app}`;
const WALLET = `https://${brand.domains.router}/wallet`;

describe("startCheckout", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
    vi.stubEnv("APP_URL", APP);
    userAgent.value = "Mozilla/5.0 (Macintosh)";
  });

  it("comes back to checkout, carrying the offer and a vetted returnTo", async () => {
    post.mockResolvedValue({
      orderId: "o1",
      kind: "qr",
      url: "weixin://pay",
      amountMinor: 5000,
      currency: "CNY",
    });

    const result = await startCheckout({
      offerId: "router_topup",
      method: "wechat",
      amount: 50,
      returnTo: WALLET,
    });

    expect(result).toMatchObject({ ok: true, checkout: { orderId: "o1" } });
    const [path, body] = post.mock.calls[0] ?? [];
    expect(path).toBe("/api/v1/billing/orders");
    expect(body).toMatchObject({
      offerId: "router_topup",
      method: "wechat",
      amount: 50,
      channel: "qr",
    });
    const success = new URL(body.successUrl);
    expect(success.origin).toBe(APP);
    expect(success.searchParams.get("paid")).toBe("1");
    expect(success.searchParams.get("returnTo")).toBe(WALLET);
    expect(new URL(body.cancelUrl).searchParams.get("paid")).toBeNull();
  });

  it("drops a returnTo that is not first party", async () => {
    post.mockResolvedValue({
      orderId: "o1",
      kind: "redirect",
      url: "u",
      amountMinor: 1,
      currency: "USD",
    });
    await startCheckout({ offerId: "x", method: "card", returnTo: "https://evil.example" });
    expect(new URL(post.mock.calls[0]?.[1].successUrl).searchParams.get("returnTo")).toBeNull();
  });

  it("asks a phone to pay inside the wallet app", async () => {
    userAgent.value = "Mozilla/5.0 (iPhone)";
    post.mockResolvedValue({
      orderId: "o1",
      kind: "redirect",
      url: "u",
      amountMinor: 1,
      currency: "CNY",
    });
    await startCheckout({ offerId: "x", method: "alipay" });
    expect(post.mock.calls[0]?.[1].channel).toBe("h5");
  });

  it.each([
    [403, "forbidden"],
    [400, "rejected"],
    [503, "unavailable"],
  ])("tells a %i apart, so the page can say what to do", async (status, error) => {
    post.mockRejectedValue(Object.assign(new Error("x"), { status }));
    await expect(startCheckout({ offerId: "x", method: "card" })).resolves.toEqual({
      ok: false,
      error,
    });
  });
});

describe("readOrder", () => {
  it("refuses an id that could not be an order before calling anything", async () => {
    await expect(readOrder("../admin")).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("reads status and whether it has been handed over", async () => {
    get.mockResolvedValue({ id: "o1", status: "PAID", fulfilled: true, amountMinor: 1 });
    await expect(readOrder("o1")).resolves.toEqual({ status: "PAID", fulfilled: true });
  });
});
