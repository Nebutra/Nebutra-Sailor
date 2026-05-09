// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.resetPassword.title": "Reset your password",
  "auth.resetPassword.description": "Choose a new password for your account.",
  "auth.resetPassword.newPasswordLabel": "New password",
  "auth.resetPassword.confirmPasswordLabel": "Confirm new password",
  "auth.resetPassword.submit": "Reset password",
  "auth.resetPassword.successTitle": "Password reset",
  "auth.resetPassword.successDescription": "You can now sign in with your new password.",
  "auth.resetPassword.signInCta": "Go to sign in",
  "auth.errors.passwordTooShort": "Password must be at least 8 characters.",
  "auth.errors.passwordsDontMatch": "Passwords don't match.",
  "auth.errors.weakPassword":
    "Password is too weak. Use at least 8 characters with mixed case and numbers.",
  "auth.errors.invalidVerificationCode": "Verification code is incorrect or expired.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
};

const pushMock = vi.fn();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    htmlType,
    onClick,
    disabled,
    type: _type,
    variant: _variant,
    ...rest
  }: {
    children?: ReactNode;
    htmlType?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
    disabled?: boolean;
    type?: string;
    variant?: string;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
    <button type={htmlType ?? "button"} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

import { ResetPasswordForm } from "../reset-password-form";

describe("ResetPasswordForm", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    vi.restoreAllMocks();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects when the two passwords don't match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "longenough123");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough456");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with token and newPassword on the happy path", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "longenough123");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        token: "tok-123",
        newPassword: "longenough123",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Password reset")).toBeInTheDocument();
    });
  });

  it("maps WEAK_PASSWORD errors via resolveAuthErrorKey", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ code: "WEAK_PASSWORD" });

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "longenough123");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Password is too weak. Use at least 8 characters with mixed case and numbers.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("maps INVALID_VERIFICATION_CODE (expired/invalid token) via the error catalog", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ code: "INVALID_VERIFICATION_CODE" });

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "longenough123");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByText("Verification code is incorrect or expired.")).toBeInTheDocument();
    });
  });

  it("disables the submit button while the request is pending", async () => {
    const user = userEvent.setup();
    const resolvers: Array<() => void> = [];
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    render(<ResetPasswordForm token="tok-123" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "longenough123");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reset password" })).toBeDisabled();
    });

    resolvers.forEach((resolve) => {
      resolve();
    });
  });
});
