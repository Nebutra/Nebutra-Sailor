import { describe, expect, it } from "vitest";
import { PUBLIC_MESSAGES } from "../messages";
import { INVESTOR_EMAIL, mailtoHref } from "./contact";

describe("investor contact", () => {
  it("writes to the founders' inbox on the Nebutra domain", () => {
    expect(INVESTOR_EMAIL).toBe("tseka@nebutra.com");
  });

  it("encodes subject and body so every mail client reads them the same", () => {
    const href = mailtoHref("KLineChartQuant：索取商业计划书", "Name:\nFirm:\n");
    expect(href).toBe(
      `mailto:${INVESTOR_EMAIL}?subject=KLineChartQuant%EF%BC%9A%E7%B4%A2%E5%8F%96%E5%95%86%E4%B8%9A%E8%AE%A1%E5%88%92%E4%B9%A6&body=Name%3A%0AFirm%3A%0A`,
    );
    expect(href).not.toContain("+");
  });

  it("keeps the business plan off the page in both languages", () => {
    // The deck carries the round; the page states intent only (research investors-page.md §2.3).
    for (const locale of ["en", "zh"] as const) {
      const copy = JSON.stringify(PUBLIC_MESSAGES[locale].investors);
      expect(copy).not.toMatch(/valuation|use of funds|估值|资金用途|万元|¥|\$\d|RMB/i);
      expect(copy).not.toMatch(/\b(?:ARR|MRR)\b/);
    }
  });
});
