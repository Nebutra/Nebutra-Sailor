"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const VERIFICATION_CODE_LENGTH = 6;

export interface TotpSetupData {
  totpUri: string;
  secret: string;
  backupCodes: string[];
}

interface EnableInitInput {
  password: string;
}

interface VerifyInput {
  code: string;
}

interface DisableInput {
  password: string;
}

interface TwoFactorBlockProps {
  capability: SecurityCapabilities["twoFactor"];
  /**
   * Whether 2FA is currently enabled — pass from parent. Defaults to `false` so the
   * existing parent that has not yet wired the runtime state still type-checks.
   */
  enabled?: boolean;
  /** Initiate enrollment. Returns TOTP URI + secret + backup codes. */
  onEnableInit?: (input: EnableInitInput) => Promise<TotpSetupData>;
  /** Verify the 6-digit code to finalize enrollment. */
  onVerify?: (input: VerifyInput) => Promise<void>;
  /** Disable 2FA. */
  onDisable?: (input: DisableInput) => Promise<void>;
  /** Called when enable / disable succeeds. */
  onChanged?: () => void;
}

type Step = "idle" | "enable-password" | "verify" | "backup-codes" | "disable-password";

async function defaultEnableInit({ password }: EnableInitInput): Promise<TotpSetupData> {
  const response = await fetch("/api/auth/two-factor/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }

  return (await response.json()) as TotpSetupData;
}

async function defaultVerify({ code }: VerifyInput): Promise<void> {
  const response = await fetch("/api/auth/two-factor/verify-totp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

async function defaultDisable({ password }: DisableInput): Promise<void> {
  const response = await fetch("/api/auth/two-factor/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

function buildQrSrc(totpUri: string): string {
  const encoded = encodeURIComponent(totpUri);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`;
}

export function TwoFactorBlock({
  capability,
  enabled = false,
  onEnableInit,
  onVerify,
  onDisable,
  onChanged,
}: TwoFactorBlockProps) {
  const t = useTranslations("auth.security.twoFactor");
  const tErrors = useTranslations("auth.errors");
  const tActions = useTranslations("Common.actions");

  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [pending, setPending] = useState(false);
  const [successMessageKey, setSuccessMessageKey] = useState<
    "successEnabled" | "successDisabled" | null
  >(null);
  const [copied, setCopied] = useState(false);

  function resetTransient() {
    setPassword("");
    setCode("");
    setErrorKey(null);
    setPending(false);
    setCopied(false);
  }

  function returnToIdle() {
    resetTransient();
    setSetupData(null);
    setStep("idle");
  }

  if (!capability.available) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            {capability.requiresPasswordAccount ? "Needs password account" : "Not wired"}
          </span>
        </div>

        <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm font-medium text-[var(--neutral-12)]">Authenticator app setup</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{capability.reason}</p>
        </div>
      </section>
    );
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;

  async function handleEnablePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (!password) {
      setErrorKey("invalidCredentials");
      return;
    }

    setPending(true);
    try {
      const submit = onEnableInit ?? defaultEnableInit;
      const data = await submit({ password });
      setSetupData(data);
      setStep("verify");
      setPassword("");
      setCode("");
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (code.length !== VERIFICATION_CODE_LENGTH) {
      setErrorKey("invalidVerificationCode");
      return;
    }

    setPending(true);
    try {
      const submit = onVerify ?? defaultVerify;
      await submit({ code });
      setStep("backup-codes");
      setSuccessMessageKey("successEnabled");
      onChanged?.();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  async function handleDisableSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (!password) {
      setErrorKey("invalidCredentials");
      return;
    }

    setPending(true);
    try {
      const submit = onDisable ?? defaultDisable;
      await submit({ password });
      setSuccessMessageKey("successDisabled");
      onChanged?.();
      returnToIdle();
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  async function handleCopyCodes() {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handleDoneFromBackupCodes() {
    setSetupData(null);
    setStep("idle");
    setPassword("");
    setCode("");
    setErrorKey(null);
    setCopied(false);
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {enabled ? t("enabled") : t("disabled")}
        </span>
      </div>

      {errorMessage && (
        <p
          className="mb-4 text-sm text-[hsl(var(--destructive))]"
          id="two-factor-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {successMessageKey && step !== "verify" && step !== "backup-codes" && (
        <p
          className="mb-4 text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
          id="two-factor-success"
          role="status"
        >
          {t(successMessageKey)}
        </p>
      )}

      {step === "idle" && (
        <div className="flex justify-start">
          {enabled ? (
            <Button
              htmlType="button"
              onClick={() => {
                resetTransient();
                setSuccessMessageKey(null);
                setStep("disable-password");
              }}
              variant="outlined"
            >
              {t("disable")}
            </Button>
          ) : (
            <Button
              htmlType="button"
              onClick={() => {
                resetTransient();
                setSuccessMessageKey(null);
                setStep("enable-password");
              }}
              type="primary"
            >
              {t("enable")}
            </Button>
          )}
        </div>
      )}

      {step === "enable-password" && (
        <form className="space-y-4" onSubmit={handleEnablePasswordSubmit} noValidate>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[var(--neutral-12)]"
              htmlFor="two-factor-enable-password"
            >
              {t("passwordPrompt")}
            </label>
            <input
              aria-describedby={errorMessage ? "two-factor-error" : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="current-password"
              className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              id="two-factor-enable-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={pending} htmlType="submit" type="primary">
              {tActions("continue")}
            </Button>
            <Button disabled={pending} htmlType="button" onClick={returnToIdle} variant="outlined">
              {tActions("cancel")}
            </Button>
          </div>
        </form>
      )}

      {step === "verify" && setupData && (
        <form className="space-y-4" onSubmit={handleVerifySubmit} noValidate>
          <p className="text-sm text-[var(--neutral-11)]">{t("scanQrCode")}</p>

          <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4 sm:flex-row sm:items-center">
            <img
              alt="Two-factor QR code"
              className="h-[200px] w-[200px] rounded bg-white p-2"
              height={200}
              src={buildQrSrc(setupData.totpUri)}
              width={200}
            />

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--neutral-10)]">
                {t("secretKeyLabel")}
              </p>
              <code className="block break-all rounded bg-[var(--neutral-3)] px-2 py-1.5 text-xs font-mono text-[var(--neutral-12)]">
                {setupData.secret}
              </code>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[var(--neutral-12)]"
              htmlFor="two-factor-code"
            >
              {t("verificationCodeLabel")}
            </label>
            <input
              aria-describedby={errorMessage ? "two-factor-error" : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="one-time-code"
              className="block w-40 rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-center font-mono text-base tracking-[0.4em] text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              id="two-factor-code"
              inputMode="numeric"
              maxLength={VERIFICATION_CODE_LENGTH}
              name="code"
              onChange={(event) => {
                const digitsOnly = event.target.value
                  .replace(/\D+/g, "")
                  .slice(0, VERIFICATION_CODE_LENGTH);
                setCode(digitsOnly);
              }}
              pattern="\d{6}"
              required
              type="text"
              value={code}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={pending} htmlType="submit" type="primary">
              {t("verify")}
            </Button>
            <Button disabled={pending} htmlType="button" onClick={returnToIdle} variant="outlined">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "backup-codes" && setupData && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--neutral-12)]">
              {t("backupCodesTitle")}
            </h4>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("backupCodesDescription")}</p>
          </div>

          <ul className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
            {setupData.backupCodes.map((backupCode) => (
              <li
                className="rounded bg-[var(--neutral-1)] px-2 py-1.5 text-center font-mono text-xs text-[var(--neutral-12)]"
                key={backupCode}
              >
                {backupCode}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Button htmlType="button" onClick={handleCopyCodes} variant="outlined">
              {t("copyBackupCodes")}
            </Button>
            <Button htmlType="button" onClick={handleDoneFromBackupCodes} type="primary">
              Done
            </Button>
            {copied && (
              <span className="text-xs text-[var(--neutral-11)]" role="status">
                Copied
              </span>
            )}
          </div>
        </div>
      )}

      {step === "disable-password" && (
        <form className="space-y-4" onSubmit={handleDisableSubmit} noValidate>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[var(--neutral-12)]"
              htmlFor="two-factor-disable-password"
            >
              {t("passwordPrompt")}
            </label>
            <input
              aria-describedby={errorMessage ? "two-factor-error" : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="current-password"
              className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              id="two-factor-disable-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={pending} htmlType="submit" type="primary">
              Confirm
            </Button>
            <Button disabled={pending} htmlType="button" onClick={returnToIdle} variant="outlined">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
