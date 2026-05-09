/**
 * Shared decorators and message fixtures for dashboard stories.
 *
 * Many `apps/web` components consume `next-intl`'s `useTranslations`. To keep
 * stories self-contained we wrap them in a `NextIntlClientProvider` with
 * curated message fixtures rather than importing the full locale bundle from
 * `@nebutra/i18n` (which would couple the storybook to that package's runtime
 * surface).
 */
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

export const STORY_LOCALE = "en";

/**
 * Curated messages for components covered by the dashboard stories.
 * Keep keys aligned with the live locale bundle in `packages/i18n/locales/en.json`.
 */
export const STORY_MESSAGES = {
  account: {
    export: {
      title: "Export my data",
      description:
        "Download a copy of every record we hold for your account, including profile, organizations, audit events, notifications, and invitations.",
      compliance:
        "Required by GDPR Article 20 (Right to data portability) and PIPL Article 45 (Right to obtain a copy of personal information).",
      export: "Export my data",
      pending: "Preparing export…",
      ready: "Your export is ready.",
      download: "Download JSON",
      error: "Failed to prepare your export. Please try again.",
    },
    emailChange: {
      title: "Change email address",
      description:
        "We will send a verification link to the new address. The change only takes effect once you confirm it from that inbox.",
      newEmailLabel: "New email address",
      newEmailPlaceholder: "you@example.com",
      submit: "Send verification link",
      submitting: "Sending…",
      verificationSent: "Check your inbox at {email} to confirm the change.",
      errorInvalidEmail: "Email address is not valid.",
      error: "Failed to request email change.",
    },
  },
  auth: {
    forgotPassword: {
      title: "Forgot password?",
      description: "Enter your email and we will send a link to reset your password.",
      emailLabel: "Email",
      submit: "Send reset link",
      successTitle: "Check your email",
      success: "If that email is registered, you'll receive a reset link shortly.",
    },
    resetPassword: {
      title: "Reset your password",
      description: "Choose a new password for your account.",
      newPasswordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      submit: "Reset password",
      successTitle: "Password reset",
      successDescription: "You can now sign in with your new password.",
      signInCta: "Go to sign in",
    },
    verifyEmail: {
      successTitle: "Email verified",
      successDescription: "Your email address has been verified.",
      failureTitle: "Verification failed",
      failureDescription: "We could not verify your email with that link.",
      continueCta: "Continue",
      signInCta: "Go to sign in",
    },
    errors: {
      invalidCredentials: "Email or password is incorrect.",
      userNotFound: "No account found with that email.",
      userAlreadyExists: "An account with that email already exists.",
      weakPassword: "Password is too weak. Use at least 8 characters with mixed case and numbers.",
      passwordsDontMatch: "Passwords don't match.",
      passwordTooShort: "Password must be at least 8 characters.",
      currentPasswordIncorrect: "Current password is incorrect.",
      samePassword: "New password must be different from your current password.",
      invalidEmail: "Email address is not valid.",
      emailNotVerified: "Please verify your email address first.",
      sessionExpired: "Your session has expired. Please sign in again.",
      twoFactorRequired: "Two-factor verification required.",
      invalidVerificationCode: "Verification code is incorrect or expired.",
      twoFactorAlreadyEnabled: "Two-factor authentication is already enabled.",
      twoFactorNotEnabled: "Two-factor authentication is not enabled.",
      tooManyAttempts: "Too many attempts. Please try again later.",
      rateLimited: "You're doing that too often. Slow down.",
      providerNotSupported: "This action is managed by your authentication provider.",
      networkError: "Network error. Check your connection and try again.",
      unknown: "Something went wrong. Please try again.",
    },
  },
  settings: {
    auditLog: {
      empty: "No audit events yet",
      columns: {
        when: "When",
        actor: "Actor",
        action: "Action",
        entity: "Entity",
        outcome: "Outcome",
        ip: "IP",
      },
      diff: {
        oldValue: "Old value",
        newValue: "New value",
      },
      filters: {
        action: "Action",
        actionPlaceholder: "Search action…",
        entityType: "Entity type",
        outcome: "Outcome",
        outcomeSuccess: "Success",
        outcomeFailure: "Failure",
        outcomePending: "Pending",
        startDate: "Start date",
        endDate: "End date",
        range24h: "Last 24h",
        range7d: "Last 7d",
        range30d: "Last 30d",
        reset: "Reset",
        all: "All",
      },
    },
  },
} as const;

/**
 * Wrap any story tree in `NextIntlClientProvider` configured with the curated
 * STORY_MESSAGES. Components using `useTranslations(...)` will resolve keys
 * against this bundle rather than crashing.
 */
export function withIntl(children: ReactNode): ReactElement {
  return (
    <NextIntlClientProvider locale={STORY_LOCALE} messages={STORY_MESSAGES} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
