// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "auth.security.twoFactor.title": "Two-factor authentication",
  "auth.security.twoFactor.description":
    "Add a second verification step using an authenticator app.",
  "auth.security.twoFactor.enabled": "Enabled",
  "auth.security.twoFactor.disabled": "Disabled",
  "auth.security.twoFactor.enable": "Enable two-factor",
  "auth.security.twoFactor.disable": "Disable two-factor",
  "auth.security.twoFactor.passwordPrompt": "Confirm your password",
  "auth.security.twoFactor.scanQrCode":
    "Scan this QR code with your authenticator app, then enter the 6-digit code below.",
  "auth.security.twoFactor.secretKeyLabel": "Or enter this secret manually",
  "auth.security.twoFactor.verificationCodeLabel": "Verification code",
  "auth.security.twoFactor.verify": "Verify and enable",
  "auth.security.twoFactor.backupCodesTitle": "Backup codes",
  "auth.security.twoFactor.backupCodesDescription":
    "Save these codes somewhere safe. Each can be used once if you lose access to your authenticator.",
  "auth.security.twoFactor.copyBackupCodes": "Copy codes",
  "auth.security.twoFactor.successEnabled": "Two-factor authentication enabled.",
  "auth.security.twoFactor.successDisabled": "Two-factor authentication disabled.",
  "auth.errors.invalidCredentials": "Email or password is incorrect.",
  "auth.errors.currentPasswordIncorrect": "Current password is incorrect.",
  "auth.errors.invalidVerificationCode": "Verification code is incorrect or expired.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
  "auth.errors.unknown": "Something went wrong. Please try again.",
  "auth.errors.twoFactorAlreadyEnabled": "Two-factor authentication is already enabled.",
  "auth.errors.twoFactorNotEnabled": "Two-factor authentication is not enabled.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

// Mock @nebutra/ui/components Button to avoid heavy transitive deps (e.g. @emoji-mart/data
// JSON imports) during the test environment. Render a real <button> so accessibility
// queries continue to work.
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

import type { SecurityCapabilities } from "../security-capabilities";
import { type TotpSetupData, TwoFactorBlock } from "../two-factor-block";

function buildAvailableCapability(
  overrides: Partial<SecurityCapabilities["twoFactor"]> = {},
): SecurityCapabilities["twoFactor"] {
  return {
    available: true,
    requiresPasswordAccount: false,
    reason: "Two-factor setup is available.",
    ...overrides,
  };
}

function buildUnavailableCapability(
  overrides: Partial<SecurityCapabilities["twoFactor"]> = {},
): SecurityCapabilities["twoFactor"] {
  return {
    available: false,
    requiresPasswordAccount: true,
    reason: "Two-factor setup requires a credential sign-in method first.",
    ...overrides,
  };
}

const SAMPLE_SETUP: TotpSetupData = {
  totpUri: "otpauth://totp/Nebutra:user@example.com?secret=ABCDEF1234567890&issuer=Nebutra",
  secret: "ABCDEF1234567890",
  backupCodes: ["aaa-111", "bbb-222", "ccc-333", "ddd-444"],
};

describe("TwoFactorBlock", () => {
  beforeEach(() => {
    // jsdom does not provide navigator.clipboard and the property is read-only by default.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the unavailable stub when capability.available is false", () => {
    const capability = buildUnavailableCapability();

    render(<TwoFactorBlock capability={capability} enabled={false} />);

    expect(screen.getByText(capability.reason)).toBeInTheDocument();
    // Should not show enable/disable buttons when unavailable
    expect(screen.queryByRole("button", { name: "Enable two-factor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable two-factor" })).not.toBeInTheDocument();
  });

  it("renders Disabled pill + Enable button when enabled is false and capability is available", () => {
    render(<TwoFactorBlock capability={buildAvailableCapability()} enabled={false} />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable two-factor" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable two-factor" })).not.toBeInTheDocument();
  });

  it("renders Enabled pill + Disable button when enabled is true", () => {
    render(<TwoFactorBlock capability={buildAvailableCapability()} enabled />);

    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable two-factor" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable two-factor" })).not.toBeInTheDocument();
  });

  it("runs the full enable flow: password → onEnableInit → QR + secret → code → onVerify → backup codes → onChanged", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockResolvedValue(SAMPLE_SETUP);
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onChanged = vi.fn();

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
        onVerify={onVerify}
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));

    // Step 1: password prompt
    const passwordInput = await screen.findByLabelText("Confirm your password");
    await user.type(passwordInput, "secret-pw-1");
    await user.click(screen.getByRole("button", { name: /continue|confirm|next/i }));

    await waitFor(() => {
      expect(onEnableInit).toHaveBeenCalledWith({ password: "secret-pw-1" });
    });

    // Step 2: QR + secret + code input
    expect(await screen.findByText(SAMPLE_SETUP.secret)).toBeInTheDocument();
    expect(screen.getByText(/Scan this QR code/i)).toBeInTheDocument();

    const codeInput = screen.getByLabelText("Verification code") as HTMLInputElement;
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: "Verify and enable" }));

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith({ code: "123456" });
    });

    // Step 3: backup codes shown
    for (const code of SAMPLE_SETUP.backupCodes) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
    expect(screen.getByText("Backup codes")).toBeInTheDocument();

    // onChanged should have fired after successful verification
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("copies backup codes joined by newline when Copy codes is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });

    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockResolvedValue(SAMPLE_SETUP);
    const onVerify = vi.fn().mockResolvedValue(undefined);

    // userEvent.setup() may install its own clipboard — re-install ours after.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
        onVerify={onVerify}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "pw");
    await user.click(screen.getByRole("button", { name: /continue|confirm|next/i }));

    await screen.findByText(SAMPLE_SETUP.secret);
    await user.type(screen.getByLabelText("Verification code"), "654321");
    await user.click(screen.getByRole("button", { name: "Verify and enable" }));

    // Re-install just before the action to ensure userEvent didn't shadow it.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });

    const copyBtn = await screen.findByRole("button", { name: "Copy codes" });
    await user.click(copyBtn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SAMPLE_SETUP.backupCodes.join("\n"));
    });
  });

  it("runs the disable flow: password → onDisable called → onChanged called", async () => {
    const user = userEvent.setup();
    const onDisable = vi.fn().mockResolvedValue(undefined);
    const onChanged = vi.fn();

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled
        onDisable={onDisable}
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Disable two-factor" }));

    const passwordInput = await screen.findByLabelText("Confirm your password");
    await user.type(passwordInput, "my-pw-9");
    await user.click(screen.getByRole("button", { name: /confirm|disable|continue/i }));

    await waitFor(() => {
      expect(onDisable).toHaveBeenCalledWith({ password: "my-pw-9" });
    });
    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Two-factor authentication disabled.")).toBeInTheDocument();
  });

  it("maps onEnableInit errors through resolveAuthErrorKey and shows the localized message", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockRejectedValue({ code: "INCORRECT_PASSWORD" });

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "wrong");
    fireEvent.submit(
      screen.getByRole("button", { name: /continue|confirm|next/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
    });
  });

  it("maps onVerify errors and shows the localized message", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockResolvedValue(SAMPLE_SETUP);
    const onVerify = vi.fn().mockRejectedValue({ code: "INVALID_TWO_FACTOR_CODE" });

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
        onVerify={onVerify}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "pw");
    await user.click(screen.getByRole("button", { name: /continue|confirm|next/i }));

    await screen.findByText(SAMPLE_SETUP.secret);
    await user.type(screen.getByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify and enable" }));

    await waitFor(() => {
      expect(screen.getByText("Verification code is incorrect or expired.")).toBeInTheDocument();
    });
  });

  it("maps onDisable errors and shows the localized message", async () => {
    const user = userEvent.setup();
    const onDisable = vi.fn().mockRejectedValue({ code: "INCORRECT_PASSWORD" });

    render(
      <TwoFactorBlock capability={buildAvailableCapability()} enabled onDisable={onDisable} />,
    );

    await user.click(screen.getByRole("button", { name: "Disable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "wrong");
    fireEvent.submit(
      screen.getByRole("button", { name: /confirm|disable|continue/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
    });
  });

  it("only accepts digits in the verification code input and caps at 6 chars", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockResolvedValue(SAMPLE_SETUP);

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "pw");
    await user.click(screen.getByRole("button", { name: /continue|confirm|next/i }));

    const codeInput = (await screen.findByLabelText("Verification code")) as HTMLInputElement;
    await user.type(codeInput, "12ab34cd5678");

    expect(codeInput.value).toBe("123456");
  });

  it("Cancel at password step returns to idle without firing callbacks", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn();

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await screen.findByLabelText("Confirm your password");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onEnableInit).not.toHaveBeenCalled();
    // Back at idle: the Enable button is visible again
    expect(screen.getByRole("button", { name: "Enable two-factor" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm your password")).not.toBeInTheDocument();
  });

  it("Cancel at verify step returns to idle without firing onVerify", async () => {
    const user = userEvent.setup();
    const onEnableInit = vi.fn().mockResolvedValue(SAMPLE_SETUP);
    const onVerify = vi.fn();

    render(
      <TwoFactorBlock
        capability={buildAvailableCapability()}
        enabled={false}
        onEnableInit={onEnableInit}
        onVerify={onVerify}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enable two-factor" }));
    await user.type(await screen.findByLabelText("Confirm your password"), "pw");
    await user.click(screen.getByRole("button", { name: /continue|confirm|next/i }));
    await screen.findByText(SAMPLE_SETUP.secret);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onVerify).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enable two-factor" })).toBeInTheDocument();
  });
});
