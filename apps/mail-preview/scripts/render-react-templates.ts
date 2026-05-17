/**
 * Render the React Email-style templates into static HTML files for the
 * mail-preview surface.
 *
 * The legacy `send*Email` HTML artifacts were pre-rendered offline. The new
 * React Email-style catalog (`welcome`, `password-reset`, `invitation`,
 * `receipt`) is rendered through this script so the catalog stays the single
 * source of truth.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { REACT_EMAIL_TEMPLATES } from "../../../packages/integrations/email/src/templates/index";

const distDir = new URL("../dist/", import.meta.url);

const fixtures = {
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
} as const;

const renderers = [
  { template: REACT_EMAIL_TEMPLATES.welcome, props: fixtures.welcome },
  { template: REACT_EMAIL_TEMPLATES.passwordReset, props: fixtures.passwordReset },
  { template: REACT_EMAIL_TEMPLATES.invitation, props: fixtures.invitation },
  { template: REACT_EMAIL_TEMPLATES.receipt, props: fixtures.receipt },
];

async function main() {
  await mkdir(distDir, { recursive: true });

  for (const { template, props } of renderers) {
    const html = (template.render as (input: typeof props) => string)(props);
    await writeFile(join(distDir.pathname, template.fileName), html);
    process.stdout.write(`rendered ${template.fileName}\n`);
  }

  process.stdout.write(`react-email templates: ${renderers.length} rendered\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mail-preview render failed: ${message}\n`);
  process.exit(1);
});
