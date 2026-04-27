import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATE_CATALOG,
  sendApiKeyCreatedEmail,
  sendCheckoutCompletedEmail,
  sendContactFormReceivedEmail,
  sendInviteEmail,
  sendInvoicePaidEmail,
  sendLicenseCreatedEmail,
  sendMagicLinkEmail,
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendPlanChangedEmail,
  sendQuotaWarningEmail,
  sendSubscriptionCanceledEmail,
  sendTrialEndingEmail,
  sendUpcomingInvoiceEmail,
  sendWelcomeEmail,
} from "../index";

const SEND_HELPERS = {
  sendApiKeyCreatedEmail,
  sendCheckoutCompletedEmail,
  sendContactFormReceivedEmail,
  sendInviteEmail,
  sendInvoicePaidEmail,
  sendLicenseCreatedEmail,
  sendMagicLinkEmail,
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendPlanChangedEmail,
  sendQuotaWarningEmail,
  sendSubscriptionCanceledEmail,
  sendTrialEndingEmail,
  sendUpcomingInvoiceEmail,
  sendWelcomeEmail,
} satisfies Record<string, unknown>;

describe("@nebutra/email contract", () => {
  it("keeps every catalog entry backed by a public send helper", () => {
    expect(EMAIL_TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(15);

    for (const template of EMAIL_TEMPLATE_CATALOG) {
      expect(SEND_HELPERS).toHaveProperty(template.sendHelper);
      expect(template.fileName).toMatch(/-email\.html$/);
    }
  });

  it("keeps preview fixture filenames unique and present in mail-preview exports", () => {
    const fileNames = EMAIL_TEMPLATE_CATALOG.map((template) => template.fileName);
    expect(new Set(fileNames).size).toBe(fileNames.length);

    const root = join(process.cwd(), "../..");
    for (const fileName of fileNames) {
      expect(existsSync(join(root, "apps/mail-preview/dist", fileName))).toBe(true);
    }
  });
});
