import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import zhHans from "../../../messages/zh-Hans.json";

const submitContactForm = vi.fn();
vi.mock("@/app/[lang]/(legal)/contact/actions", () => ({
  submitContactForm: (...args: unknown[]) => submitContactForm(...args),
}));

const { requestIntro } = await import("./actions");

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("requestIntro", () => {
  beforeEach(() => {
    submitContactForm.mockReset();
    submitContactForm.mockResolvedValue({ status: "success" });
  });

  it("routes a deck request through the site's contact pipeline as a partnership enquiry", async () => {
    const state = await requestIntro(
      { status: "idle" },
      form({ intent: "deck", name: "Ada", email: "ada@fund.example", firm: "Fund" }),
    );
    expect(state).toEqual({ status: "success" });
    const sent = submitContactForm.mock.calls[0]?.[1] as FormData;
    expect(sent.get("category")).toBe("partnership");
    expect(sent.get("subject")).toBe("[Investors] Deck request — Fund");
    expect(sent.get("company")).toBe("Fund");
    // The contact action needs ≥10 characters even when the visitor wrote nothing.
    expect(String(sent.get("message")).length).toBeGreaterThanOrEqual(10);
  });

  it("rejects an unknown intent or a bad email without sending", async () => {
    expect(
      await requestIntro(
        { status: "idle" },
        form({ intent: "valuation", name: "A", email: "a@b.co" }),
      ),
    ).toEqual({ status: "error" });
    expect(
      await requestIntro({ status: "idle" }, form({ intent: "call", name: "A", email: "nope" })),
    ).toEqual({ status: "error" });
    expect(submitContactForm).not.toHaveBeenCalled();
  });

  it("reports a delivery failure as an error", async () => {
    submitContactForm.mockResolvedValue({ status: "error", message: "HTTP 500" });
    expect(
      await requestIntro(
        { status: "idle" },
        form({ intent: "partner", name: "A", email: "a@b.co" }),
      ),
    ).toEqual({ status: "error" });
  });
});

/**
 * The page sells the story; the business plan stays private. Round size,
 * valuation, dilution, use of funds and revenue projections must never reach
 * the public copy, in any language we hand-write.
 */
describe("investors copy discloses nothing from the business plan", () => {
  const BANNED = [
    /万元|亿元|人民币|RMB|CNY|¥|\$\s?\d/i,
    /valuation|pre-money|post-money|dilution|use of funds|revenue/i,
    /\b(ARR|MRR|GMV)\b/,
    /估值|稀释|资金用途|营收|收入预测|融资金额/,
    /\d+\s?%/,
  ];
  for (const [name, catalog] of [
    ["en", en],
    ["zh-Hans", zhHans],
  ] as const) {
    it(name, () => {
      const copy = JSON.stringify(catalog.sitePages.investors);
      for (const re of BANNED) expect(copy, String(re)).not.toMatch(re);
    });
  }
});
