import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATE_CATALOG } from "../../index";
import {
  REACT_EMAIL_TEMPLATES,
  renderInvitationEmail,
  renderPasswordResetEmail,
  renderReceiptEmail,
  renderWelcomeEmail,
} from "../index";

describe("welcome template", () => {
  const props = {
    userName: "Ada Lovelace",
    loginUrl: "https://app.nebutra.ai/login",
    brandName: "Nebutra",
  };

  it("renders subject with brand name", () => {
    expect(REACT_EMAIL_TEMPLATES.welcome.subject(props)).toBe("Welcome to Nebutra");
  });

  it("renders preview text", () => {
    expect(REACT_EMAIL_TEMPLATES.welcome.preview(props)).toBe("Get started with your account");
  });

  it("includes user name, brand and login url in HTML body", () => {
    const html = renderWelcomeEmail(props);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Nebutra");
    expect(html).toContain("https://app.nebutra.ai/login");
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });
});

describe("password-reset template", () => {
  const props = {
    userName: "Grace Hopper",
    resetUrl: "https://app.nebutra.ai/reset?token=abc",
    expiresInMinutes: 30,
    brandName: "Nebutra",
  };

  it("renders branded subject", () => {
    expect(REACT_EMAIL_TEMPLATES.passwordReset.subject(props)).toBe("Reset your Nebutra password");
  });

  it("renders expiry-aware preview", () => {
    expect(REACT_EMAIL_TEMPLATES.passwordReset.preview(props)).toContain("30 minutes");
  });

  it("includes reset url, user name, expiry and disclaimer in HTML body", () => {
    const html = renderPasswordResetEmail(props);
    expect(html).toContain("Grace Hopper");
    expect(html).toContain("https://app.nebutra.ai/reset?token=abc");
    expect(html).toContain("30 minutes");
    expect(html.toLowerCase()).toContain("if this wasn't you");
  });
});

describe("invitation template", () => {
  const props = {
    inviterName: "Alan Turing",
    organizationName: "Bletchley Inc.",
    role: "admin",
    acceptUrl: "https://app.nebutra.ai/invites/xyz",
    expiresAt: "2026-06-01",
    brandName: "Nebutra",
  };

  it("renders subject mentioning inviter and organization", () => {
    const subject = REACT_EMAIL_TEMPLATES.invitation.subject(props);
    expect(subject).toContain("Alan Turing");
    expect(subject).toContain("Bletchley Inc.");
  });

  it("includes role badge, accept url, expiry and brand footer in HTML body", () => {
    const html = renderInvitationEmail(props);
    expect(html).toContain("Alan Turing");
    expect(html).toContain("Bletchley Inc.");
    expect(html).toContain("admin");
    expect(html).toContain("https://app.nebutra.ai/invites/xyz");
    expect(html).toContain("2026-06-01");
    expect(html).toContain("Sent by Nebutra");
  });
});

describe("receipt template", () => {
  const props = {
    customerName: "Margaret Hamilton",
    invoiceNumber: "INV-001234",
    amount: "129.00",
    currency: "USD",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    downloadUrl: "https://app.nebutra.ai/receipts/INV-001234.pdf",
    brandName: "Nebutra",
  };

  it("renders invoice-number subject", () => {
    expect(REACT_EMAIL_TEMPLATES.receipt.subject(props)).toBe("Receipt for INV-001234");
  });

  it("includes amount, period, invoice number and download link in HTML body", () => {
    const html = renderReceiptEmail(props);
    expect(html).toContain("Margaret Hamilton");
    expect(html).toContain("INV-001234");
    expect(html).toContain("129.00");
    expect(html).toContain("USD");
    expect(html).toContain("2026-04-01");
    expect(html).toContain("2026-04-30");
    expect(html).toContain("https://app.nebutra.ai/receipts/INV-001234.pdf");
  });
});

describe("React Email template catalog", () => {
  it("exposes exactly the four new production templates", () => {
    const ids = Object.values(REACT_EMAIL_TEMPLATES).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining(["welcome-react", "password-reset", "invitation", "receipt"]),
    );
  });

  it("registers each new template in EMAIL_TEMPLATE_CATALOG so mail-preview picks it up", () => {
    const catalogIds = new Set(EMAIL_TEMPLATE_CATALOG.map((entry) => entry.id));
    for (const template of Object.values(REACT_EMAIL_TEMPLATES)) {
      expect(catalogIds.has(template.id)).toBe(true);
    }
  });

  it("escapes HTML-unsafe characters in user-supplied props", () => {
    const html = renderWelcomeEmail({
      userName: "<script>alert(1)</script>",
      loginUrl: "https://example.com",
      brandName: "Nebutra",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
