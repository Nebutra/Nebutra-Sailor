// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.forgotPassword.title": "Forgot password?",
  "auth.forgotPassword.description":
    "Enter your email and we will send a link to reset your password.",
  "auth.forgotPassword.emailLabel": "Email",
  "auth.forgotPassword.submit": "Send reset link",
  "auth.forgotPassword.success":
    "If that email is registered, you'll receive a reset link shortly.",
  "auth.forgotPassword.successTitle": "Check your email",
  "auth.errors.invalidEmail": "Email address is not valid.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.rateLimited": "You're doing that too often. Slow down.",
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

import { ForgotPasswordForm } from "../forgot-password-form";

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the email input and submit button", () => {
    render(<ForgotPasswordForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("calls onSubmit with the email when submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("shows the success view after a successful submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows a localized error when the email is malformed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(screen.getByText("Email address is not valid.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("maps a rejected onSubmit through resolveAuthErrorKey", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ code: "TOO_MANY_REQUESTS" });

    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(screen.getByText("You're doing that too often. Slow down.")).toBeInTheDocument();
    });
  });

  it("disables the submit button while pending", async () => {
    const user = userEvent.setup();
    const resolvers: Array<() => void> = [];
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send reset link" })).toBeDisabled();
    });

    resolvers.forEach((resolve) => {
      resolve();
    });
  });
});
