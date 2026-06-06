/**
 * Unit tests for injectBrandVars — the immutable recursive brand-placeholder
 * substitutor used in apps/landing-page/src/i18n/request.ts.
 *
 * Phase 4 of brand-meta-replacement-governance.
 */

import { describe, expect, it } from "vitest";
import { injectBrandVars } from "../request";

describe("injectBrandVars", () => {
  const vars = {
    brandName: "TestBrand",
    brandNameCn: "测试品牌",
    companyLegal: "无锡测试科技有限公司",
    companyLegalEn: "Wuxi Test Technology Co., Ltd.",
    productName: "TestBrand Sailor",
  };

  it("substitutes {placeholder} tokens in string values", () => {
    const result = injectBrandVars(
      { title: "Welcome to {brandName}!" } as Record<string, unknown>,
      vars,
    );
    expect((result as Record<string, string>).title).toBe("Welcome to TestBrand!");
  });

  it("recurses into nested objects (immutably)", () => {
    const input = {
      footer: {
        copyright: "© 2026 {brandName} Intelligence. All rights reserved.",
        contact: {
          company: "{companyLegalEn}",
        },
      },
    };
    const result = injectBrandVars(input as Record<string, unknown>, vars);
    const footer = (result as typeof input).footer;
    expect(footer.copyright).toBe("© 2026 TestBrand Intelligence. All rights reserved.");
    expect(footer.contact.company).toBe("Wuxi Test Technology Co., Ltd.");
    // Immutability: original is untouched
    expect(input.footer.copyright).toBe("© 2026 {brandName} Intelligence. All rights reserved.");
  });

  it("leaves next-intl rich-text tags and numeric-keyed objects untouched", () => {
    const input = {
      subheadline: "Built for <highlight>AI coding agents</highlight> & founders.",
      cookies: {
        "0": {
          name: "__session",
          provider: "{brandName}",
        },
      },
    } as Record<string, unknown>;
    const result = injectBrandVars(input, vars);
    const r = result as typeof input;
    // Rich-text tags preserved as-is
    expect(r.subheadline).toBe("Built for <highlight>AI coding agents</highlight> & founders.");
    // Numeric-keyed objects recursed into safely
    const cookies = r.cookies as typeof input.cookies;
    expect((cookies as Record<string, Record<string, string>>)["0"].provider).toBe("TestBrand");
  });

  it("leaves unknown placeholder tokens as literal text (no crash)", () => {
    const result = injectBrandVars({ msg: "Hello {unknownVar}!" } as Record<string, unknown>, vars);
    expect((result as Record<string, string>).msg).toBe("Hello {unknownVar}!");
  });
});
