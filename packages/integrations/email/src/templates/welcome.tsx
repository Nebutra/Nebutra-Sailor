/**
 * WelcomeEmail — onboarding welcome message for new accounts.
 *
 * react-email is not installed; this module exposes the same
 * `{ subject, preview, render }` contract using a plain template literal so the
 * catalog can be migrated to React Email later without changing call sites.
 */

import { baseLayout, escapeHtml, palette } from "./_layout";

export interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
  brandName: string;
}

export function subject(props: WelcomeEmailProps): string {
  return `Welcome to ${props.brandName}`;
}

export function preview(_props: WelcomeEmailProps): string {
  return "Get started with your account";
}

export function render(props: WelcomeEmailProps): string {
  const userName = escapeHtml(props.userName);
  const loginUrl = escapeHtml(props.loginUrl);
  const brandName = escapeHtml(props.brandName);

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:${palette.heading};">Welcome, ${userName}!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:${palette.body};line-height:1.6;">
      We're glad to have you with ${brandName}. Your account is ready &mdash; sign in to
      explore the dashboard, set up your workspace, and invite the rest of your team.
    </p>
    <a href="${loginUrl}" style="display:inline-block;background:${palette.gradient};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Get Started &rarr;
    </a>
    <p style="margin:0;font-size:13px;color:${palette.muted};">
      Need help? Reply to this email and a real human from the ${brandName} team will get back to you.
    </p>
  `;

  return baseLayout({
    brandName: props.brandName,
    preview: preview(props),
    body,
  });
}

export const welcomeEmail = { subject, preview, render } as const;
