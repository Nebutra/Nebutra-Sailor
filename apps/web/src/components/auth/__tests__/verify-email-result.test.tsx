// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.verifyEmail.successTitle": "Email verified",
  "auth.verifyEmail.successDescription": "Your email address has been verified.",
  "auth.verifyEmail.failureTitle": "Verification failed",
  "auth.verifyEmail.failureDescription": "We could not verify your email with that link.",
  "auth.verifyEmail.continueCta": "Continue",
  "auth.verifyEmail.signInCta": "Go to sign in",
  "auth.errors.invalidVerificationCode": "Verification code is incorrect or expired.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const fullKey = `${namespace}.${key}`;
    const template = messages[fullKey] ?? fullKey;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      values[name] !== undefined ? String(values[name]) : `{${name}}`,
    );
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { VerifyEmailResult } from "../verify-email-result";

describe("VerifyEmailResult", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the success view with the continue CTA", () => {
    render(<VerifyEmailResult success />);
    expect(screen.getByText("Email verified")).toBeInTheDocument();
    expect(screen.getByText("Your email address has been verified.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
  });

  it("renders the failure view with a localized error and sign-in CTA", () => {
    render(<VerifyEmailResult success={false} errorKey="invalidVerificationCode" />);
    expect(screen.getByText("Verification failed")).toBeInTheDocument();
    expect(screen.getByText("Verification code is incorrect or expired.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("falls back to the unknown error when no errorKey is provided", () => {
    render(<VerifyEmailResult success={false} />);
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });
});
