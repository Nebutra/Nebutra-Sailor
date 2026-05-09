// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.security.setPassword.title": "Set a password",
  "auth.security.setPassword.description": "Add a password to sign in without your OAuth provider.",
  "auth.security.setPassword.submit": "Set password",
  "auth.security.setPassword.sentMessage": "We've sent a password setup link to your email.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
  "auth.errors.invalidEmail": "Email address is not valid.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
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

import { SetPasswordForm } from "../set-password-form";

describe("SetPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the Set password button initially", () => {
    render(<SetPasswordForm email="user@example.com" />);

    expect(screen.getByRole("button", { name: "Set password" })).toBeInTheDocument();
    expect(
      screen.queryByText("We've sent a password setup link to your email."),
    ).not.toBeInTheDocument();
  });

  it("calls onSubmit with the email when Set password is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SetPasswordForm email="user@example.com" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("shows the email confirmation message after a successful submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SetPasswordForm email="user@example.com" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => {
      expect(
        screen.getByText("We've sent a password setup link to your email."),
      ).toBeInTheDocument();
    });
  });

  it("displays a localized error when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ code: "UNKNOWN" });

    render(<SetPasswordForm email="user@example.com" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });
  });
});
