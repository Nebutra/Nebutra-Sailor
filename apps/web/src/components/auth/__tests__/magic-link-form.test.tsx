// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.magicLink.title": "Sign in with a magic link",
  "auth.magicLink.description": "Enter your email and we'll send you a 6-digit code to sign in.",
  "auth.magicLink.emailLabel": "Email",
  "auth.magicLink.send": "Send link",
  "auth.magicLink.codeLabel": "Verification code",
  "auth.magicLink.verify": "Verify",
  "auth.magicLink.resend": "Resend code",
  "auth.magicLink.resendCooldown": "Resend in {seconds}s",
  "auth.magicLink.sentTo": "We sent a code to {email}",
  "auth.errors.invalidEmail": "Email address is not valid.",
  "auth.errors.invalidVerificationCode": "Verification code is incorrect or expired.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
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

import { MagicLinkForm } from "../magic-link-form";

describe("MagicLinkForm", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it("submits the email and switches to OTP stage", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn().mockResolvedValue(undefined);
    const onVerify = vi.fn();

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={onVerify} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    await waitFor(() => {
      expect(onSendLink).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
    });
  });

  it("auto-submits the verify call when 6 digits are entered", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn().mockResolvedValue(undefined);
    const onVerify = vi.fn().mockResolvedValue({ session: "ok" });
    const onSuccess = vi.fn();

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={onVerify} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    const codeInput = await screen.findByLabelText("Verification code");
    await user.type(codeInput, "123456");

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith({ email: "user@example.com", code: "123456" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ session: "ok" });
    });
  });

  it("shows a localized error when the email is invalid", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn();

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    await waitFor(() => {
      expect(screen.getByText("Email address is not valid.")).toBeInTheDocument();
    });
    expect(onSendLink).not.toHaveBeenCalled();
  });

  it("maps onVerify errors through resolveAuthErrorKey", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn().mockResolvedValue(undefined);
    const onVerify = vi.fn().mockRejectedValue({ code: "INVALID_VERIFICATION_CODE" });

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={onVerify} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));
    await screen.findByLabelText("Verification code");
    await user.type(screen.getByLabelText("Verification code"), "000000");

    await waitFor(() => {
      expect(screen.getByText("Verification code is incorrect or expired.")).toBeInTheDocument();
    });
  });

  it("disables resend during the 30s cooldown", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn().mockResolvedValue(undefined);

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    const resendBtn = await screen.findByRole("button", { name: /Resend/ });
    expect(resendBtn).toBeDisabled();
  });

  it("re-enables resend after the cooldown elapses", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSendLink = vi.fn().mockResolvedValue(undefined);

    render(<MagicLinkForm onSendLink={onSendLink} onVerify={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    await screen.findByRole("button", { name: /Resend/ });

    // Advance through each tick of the 30-second cooldown so the setInterval
    // callback fires and the React state updates flush.
    for (let i = 0; i < 31; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
    }

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resend code" })).not.toBeDisabled();
    });
  });
});
