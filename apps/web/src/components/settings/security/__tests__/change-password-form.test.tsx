// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.security.changePassword.title": "Change password",
  "auth.security.changePassword.description":
    "Use a strong password you don't reuse on other sites.",
  "auth.security.changePassword.currentPasswordLabel": "Current password",
  "auth.security.changePassword.newPasswordLabel": "New password",
  "auth.security.changePassword.confirmPasswordLabel": "Confirm new password",
  "auth.security.changePassword.revokeOtherSessions": "Sign out of other devices",
  "auth.security.changePassword.submit": "Update password",
  "auth.security.changePassword.success": "Password updated successfully.",
  "auth.errors.invalidCredentials": "Email or password is incorrect.",
  "auth.errors.userNotFound": "No account found with that email.",
  "auth.errors.userAlreadyExists": "An account with that email already exists.",
  "auth.errors.weakPassword":
    "Password is too weak. Use at least 8 characters with mixed case and numbers.",
  "auth.errors.passwordsDontMatch": "Passwords don't match.",
  "auth.errors.passwordTooShort": "Password must be at least 8 characters.",
  "auth.errors.currentPasswordIncorrect": "Current password is incorrect.",
  "auth.errors.samePassword": "New password must be different from your current password.",
  "auth.errors.invalidEmail": "Email address is not valid.",
  "auth.errors.emailNotVerified": "Please verify your email address first.",
  "auth.errors.sessionExpired": "Your session has expired. Please sign in again.",
  "auth.errors.twoFactorRequired": "Two-factor verification required.",
  "auth.errors.invalidVerificationCode": "Verification code is incorrect or expired.",
  "auth.errors.twoFactorAlreadyEnabled": "Two-factor authentication is already enabled.",
  "auth.errors.twoFactorNotEnabled": "Two-factor authentication is not enabled.",
  "auth.errors.tooManyAttempts": "Too many attempts. Please try again later.",
  "auth.errors.rateLimited": "You're doing that too often. Slow down.",
  "auth.errors.providerNotSupported": "This action is managed by your authentication provider.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

// Avoid loading the heavy @nebutra/ui barrel (which pulls Lobe UI / emoji-mart) in tests.
vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    disabled,
    htmlType,
    onClick,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    htmlType?: "button" | "submit" | "reset";
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    type?: string;
    variant?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} type={htmlType ?? "button"}>
      {children}
    </button>
  ),
}));

import { ChangePasswordForm } from "../change-password-form";
import type { SecurityCapabilities } from "../security-capabilities";

function buildPasswordCapability(
  overrides: Partial<SecurityCapabilities["password"]> = {},
): SecurityCapabilities["password"] {
  return {
    available: true,
    hasPasswordAccount: true,
    reason: "Credential sign-in is attached.",
    ...overrides,
  };
}

describe("ChangePasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the OAuth-only stub when hasPasswordAccount is false", () => {
    const capability = buildPasswordCapability({
      available: false,
      hasPasswordAccount: false,
      reason: "Password management is unavailable because this account does not use password.",
    });

    render(<ChangePasswordForm capability={capability} />);

    expect(screen.getByText("OAuth only")).toBeInTheDocument();
    expect(screen.getByText(capability.reason)).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update password" })).not.toBeInTheDocument();
  });

  it("renders the credential form when hasPasswordAccount is true", () => {
    render(<ChangePasswordForm capability={buildPasswordCapability()} />);

    expect(screen.getByText("Credential attached")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByLabelText("Sign out of other devices")).toBeChecked();
    expect(screen.getByRole("button", { name: "Update password" })).toBeInTheDocument();
  });

  it("shows passwordTooShort error when new password is shorter than 8 chars", async () => {
    const onSubmit = vi.fn();
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "short" } });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows passwordsDontMatch error when confirmation differs", async () => {
    const onSubmit = vi.fn();
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "long-enough-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different-1" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows samePassword error when new password equals current", async () => {
    const onSubmit = vi.fn();
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "same-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "same-pass-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "same-pass-1" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText("New password must be different from your current password."),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the correct payload (revokeOtherSessions defaults to true)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-pass-strong-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-pass-strong-1" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        currentPassword: "old-pass-1",
        newPassword: "new-pass-strong-1",
        revokeOtherSessions: true,
      });
    });
  });

  it("shows the success message and clears inputs after a successful submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    const current = screen.getByLabelText("Current password") as HTMLInputElement;
    const next = screen.getByLabelText("New password") as HTMLInputElement;
    const confirm = screen.getByLabelText("Confirm new password") as HTMLInputElement;

    await user.type(current, "old-pass-1");
    await user.type(next, "new-pass-strong-1");
    await user.type(confirm, "new-pass-strong-1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(screen.getByText("Password updated successfully.")).toBeInTheDocument();
    });

    expect(current.value).toBe("");
    expect(next.value).toBe("");
    expect(confirm.value).toBe("");
  });

  it("shows mapped error message when onSubmit throws { code: 'INCORRECT_PASSWORD' }", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ code: "INCORRECT_PASSWORD" });
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-pass-strong-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-pass-strong-1" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
    });
  });

  it("shows the generic unknown error when error has no recognizable code", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ code: "TOTALLY_UNKNOWN_THING" });
    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-pass-strong-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-pass-strong-1" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });
  });

  it("disables the submit button while pending", async () => {
    let resolveSubmit: (() => void) | null = null;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(<ChangePasswordForm capability={buildPasswordCapability()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-pass-strong-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-pass-strong-1" },
    });

    const button = screen.getByRole("button", { name: "Update password" });
    fireEvent.submit(button.closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
    });

    resolveSubmit!();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Update password" })).not.toBeDisabled();
    });
  });
});
