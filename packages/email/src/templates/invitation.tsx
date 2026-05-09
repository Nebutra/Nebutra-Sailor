/**
 * InvitationEmail — workspace member invitation with role and expiry.
 *
 * react-email is not installed; this module exposes the same
 * `{ subject, preview, render }` contract using a plain template literal so the
 * catalog can be migrated to React Email later without changing call sites.
 */

import { baseLayout, escapeHtml, palette } from "./_layout";

export interface InvitationEmailProps {
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
  brandName: string;
}

export function subject(props: InvitationEmailProps): string {
  return `${props.inviterName} invited you to join ${props.organizationName}`;
}

export function preview(props: InvitationEmailProps): string {
  return `You've been invited to ${props.organizationName} as ${props.role}`;
}

export function render(props: InvitationEmailProps): string {
  const inviterName = escapeHtml(props.inviterName);
  const organizationName = escapeHtml(props.organizationName);
  const role = escapeHtml(props.role);
  const acceptUrl = escapeHtml(props.acceptUrl);
  const expiresAt = escapeHtml(props.expiresAt);
  const brandName = escapeHtml(props.brandName);

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:${palette.heading};">You're invited to ${organizationName}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:${palette.body};line-height:1.6;">
      <strong>${inviterName}</strong> has invited you to collaborate on
      <strong>${organizationName}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:${palette.body};">
      Role:
      <span style="display:inline-block;background:#e0f2fe;color:#0033FE;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:600;margin-left:6px;">
        ${role}
      </span>
    </p>
    <a href="${acceptUrl}" style="display:inline-block;background:${palette.gradient};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Accept invitation &rarr;
    </a>
    <p style="margin:0 0 12px;font-size:13px;color:${palette.muted};">
      This invitation expires on <strong>${expiresAt}</strong>.
    </p>
    <p style="margin:0;font-size:13px;color:${palette.muted};">
      Sent by ${brandName} on behalf of ${organizationName}. If you weren't expecting this, you can
      safely ignore the message.
    </p>
  `;

  return baseLayout({
    brandName: props.brandName,
    preview: preview(props),
    body,
  });
}

export const invitationEmail = { subject, preview, render } as const;
