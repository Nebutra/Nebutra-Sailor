/**
 * ReceiptEmail — payment confirmation with billing period and invoice download.
 *
 * react-email is not installed; this module exposes the same
 * `{ subject, preview, render }` contract using a plain template literal so the
 * catalog can be migrated to React Email later without changing call sites.
 */

import { baseLayout, escapeHtml, palette } from "./_layout";

export interface ReceiptEmailProps {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  downloadUrl: string;
  brandName: string;
}

export function subject(props: ReceiptEmailProps): string {
  return `Receipt for ${props.invoiceNumber}`;
}

export function preview(props: ReceiptEmailProps): string {
  return `Payment of ${props.amount} ${props.currency} received`;
}

export function render(props: ReceiptEmailProps): string {
  const customerName = escapeHtml(props.customerName);
  const invoiceNumber = escapeHtml(props.invoiceNumber);
  const amount = escapeHtml(props.amount);
  const currency = escapeHtml(props.currency);
  const periodStart = escapeHtml(props.periodStart);
  const periodEnd = escapeHtml(props.periodEnd);
  const downloadUrl = escapeHtml(props.downloadUrl);
  const brandName = escapeHtml(props.brandName);

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:${palette.heading};">Payment received &check;</h2>
    <p style="margin:0 0 16px;font-size:15px;color:${palette.body};line-height:1.6;">
      Hi ${customerName}, thank you for your payment. Here's a summary of your latest invoice from
      ${brandName}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;border:1px solid ${palette.border};border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid ${palette.border};font-size:13px;color:${palette.muted};">Invoice number</td>
        <td style="padding:12px 16px;border-bottom:1px solid ${palette.border};font-size:14px;color:${palette.heading};text-align:right;font-weight:600;">${invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid ${palette.border};font-size:13px;color:${palette.muted};">Billing period</td>
        <td style="padding:12px 16px;border-bottom:1px solid ${palette.border};font-size:14px;color:${palette.heading};text-align:right;">${periodStart} &mdash; ${periodEnd}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:${palette.muted};">Amount paid</td>
        <td style="padding:12px 16px;font-size:14px;color:#16a34a;text-align:right;font-weight:700;">${amount} ${currency}</td>
      </tr>
    </table>
    <a href="${downloadUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Download PDF receipt &rarr;
    </a>
    <p style="margin:0;font-size:13px;color:${palette.muted};">
      Keep this receipt for your records. Questions about this charge? Reply to this email and the
      ${brandName} billing team will help.
    </p>
  `;

  return baseLayout({
    brandName: props.brandName,
    preview: preview(props),
    body,
  });
}

export const receiptEmail = { subject, preview, render } as const;
