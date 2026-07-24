import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
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
    loginUrl: `${getBrandOrigin("app")}/login`,
    brandName: brand.name,
  },
  passwordReset: {
    userName: "Ada Lovelace",
    resetUrl: `${getBrandOrigin("app")}/reset?token=preview`,
    expiresInMinutes: 30,
    brandName: brand.name,
  },
  invitation: {
    inviterName: "Grace Hopper",
    organizationName: `${brand.name} Engineering`,
    role: "admin",
    acceptUrl: `${getBrandOrigin("app")}/invites/preview`,
    expiresAt: "2026-06-01",
    brandName: brand.name,
  },
  receipt: {
    customerName: "Ada Lovelace",
    invoiceNumber: "INV-002468",
    amount: "129.00",
    currency: "USD",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    downloadUrl: `${getBrandOrigin("app")}/receipts/INV-002468.pdf`,
    brandName: brand.name,
  },
};
