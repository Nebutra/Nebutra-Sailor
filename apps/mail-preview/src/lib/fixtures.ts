/**
 * Default props for each template in REACT_EMAIL_TEMPLATES. Mirrors the
 * fixtures used by `scripts/render-react-templates.ts` so the live preview app
 * and the static export render the same content out of the box.
 *
 * Keys must match the keys of `REACT_EMAIL_TEMPLATES` in @nebutra/email.
 */

export const TEMPLATE_FIXTURES: Record<string, Record<string, unknown>> = {
  welcome: {
    userName: "Ada Lovelace",
    loginUrl: "https://app.nebutra.ai/login",
    brandName: "Nebutra",
  },
  passwordReset: {
    userName: "Ada Lovelace",
    resetUrl: "https://app.nebutra.ai/reset?token=preview",
    expiresInMinutes: 30,
    brandName: "Nebutra",
  },
  invitation: {
    inviterName: "Grace Hopper",
    organizationName: "Nebutra Engineering",
    role: "admin",
    acceptUrl: "https://app.nebutra.ai/invites/preview",
    expiresAt: "2026-06-01",
    brandName: "Nebutra",
  },
  receipt: {
    customerName: "Ada Lovelace",
    invoiceNumber: "INV-002468",
    amount: "129.00",
    currency: "USD",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    downloadUrl: "https://app.nebutra.ai/receipts/INV-002468.pdf",
    brandName: "Nebutra",
  },
};
