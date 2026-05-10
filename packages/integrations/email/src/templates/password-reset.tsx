/**
 * PasswordResetEmail — secure password reset link with expiry.
 *
 * react-email is not installed; this module exposes the same
 * `{ subject, preview, render }` contract using a plain template literal so the
 * catalog can be migrated to React Email later without changing call sites.
 */

import { baseLayout, escapeHtml, palette } from "./_layout";

export interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
  brandName: string;
}

export function subject(props: PasswordResetEmailProps): string {
  return `Reset your ${props.brandName} password`;
}

export function preview(props: PasswordResetEmailProps): string {
  return `Reset link expires in ${props.expiresInMinutes} minutes`;
}

export function render(props: PasswordResetEmailProps): string {
  const userName = escapeHtml(props.userName);
  const resetUrl = escapeHtml(props.resetUrl);
  const brandName = escapeHtml(props.brandName);
  const expires = String(props.expiresInMinutes);

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:${palette.heading};">Reset your password</h2>
    <p style="margin:0 0 16px;font-size:15px;color:${palette.body};line-height:1.6;">
      Hi ${userName}, we received a request to reset the password on your ${brandName} account.
      Click the button below to choose a new one.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:${palette.gradient};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Reset password &rarr;
    </a>
    <p style="margin:0 0 16px;font-size:14px;color:${palette.body};line-height:1.6;">
      This link expires in <strong>${expires} minutes</strong>. If it's expired, request a new one
      from the sign-in page.
    </p>
    <p style="margin:0;font-size:13px;color:${palette.muted};line-height:1.5;">
      If this wasn't you, you can safely ignore this email &mdash; your password won't change unless
      you click the link above. For added safety, review recent sign-ins on your account.
    </p>
  `;

  return baseLayout({
    brandName: props.brandName,
    preview: preview(props),
    body,
  });
}

export const passwordResetEmail = { subject, preview, render } as const;
