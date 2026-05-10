/**
 * React Email-style template catalog.
 *
 * Each template module exports `{ subject, preview, render }` plus a typed
 * Props interface. They render to a complete HTML document via plain template
 * literals (react-email is not installed in this workspace; see AGENTS.md).
 *
 * The legacy `send*Email` helpers in `../index.ts` remain the canonical way to
 * dispatch transactional email. These template modules are the new React-Email
 * shaped surface intended for the mail-preview app and future migration.
 */

export type { RenderedEmail } from "./_layout";
export {
  type InvitationEmailProps,
  invitationEmail,
  preview as invitationEmailPreview,
  render as renderInvitationEmail,
  subject as invitationEmailSubject,
} from "./invitation";
export {
  type PasswordResetEmailProps,
  passwordResetEmail,
  preview as passwordResetEmailPreview,
  render as renderPasswordResetEmail,
  subject as passwordResetEmailSubject,
} from "./password-reset";

export {
  preview as receiptEmailPreview,
  type ReceiptEmailProps,
  receiptEmail,
  render as renderReceiptEmail,
  subject as receiptEmailSubject,
} from "./receipt";
export {
  preview as welcomeEmailPreview,
  render as renderWelcomeEmail,
  subject as welcomeEmailSubject,
  type WelcomeEmailProps,
  welcomeEmail,
} from "./welcome";

import { invitationEmail } from "./invitation";
import { passwordResetEmail } from "./password-reset";
import { receiptEmail } from "./receipt";
import { welcomeEmail } from "./welcome";

/**
 * Stable shape of a registered template entry for the React Email-style
 * catalog. Distinct from `EMAIL_TEMPLATE_CATALOG` in `../index.ts` which tracks
 * the legacy `send*Email` helper surface.
 */
export interface ReactEmailTemplate<P> {
  id: string;
  label: string;
  description: string;
  fileName: string;
  subject: (props: P) => string;
  preview: (props: P) => string;
  render: (props: P) => string;
}

export const REACT_EMAIL_TEMPLATES = {
  welcome: {
    id: "welcome-react",
    label: "Welcome (React Email)",
    description: "Account onboarding welcome message",
    fileName: "welcome-react-email.html",
    ...welcomeEmail,
  },
  passwordReset: {
    id: "password-reset",
    label: "Password Reset",
    description: "Secure password reset link with expiry",
    fileName: "password-reset-email.html",
    ...passwordResetEmail,
  },
  invitation: {
    id: "invitation",
    label: "Invitation",
    description: "Workspace invitation with role and expiry",
    fileName: "invitation-email.html",
    ...invitationEmail,
  },
  receipt: {
    id: "receipt",
    label: "Receipt",
    description: "Payment receipt with billing period and PDF link",
    fileName: "receipt-email.html",
    ...receiptEmail,
  },
} as const;
