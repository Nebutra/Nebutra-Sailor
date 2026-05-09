"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const MIN_PASSWORD_LENGTH = 8;

export interface ChangePasswordSubmitInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}

interface ChangePasswordFormProps {
  capability: SecurityCapabilities["password"];
  /** Optional override for testing — defaults to fetch POST /api/auth/change-password */
  onSubmit?: (input: ChangePasswordSubmitInput) => Promise<void>;
  /** When true, the parent is still resolving capabilities; show a skeleton. */
  loading?: boolean;
}

async function defaultSubmit(input: ChangePasswordSubmitInput): Promise<void> {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function ChangePasswordForm({
  capability,
  onSubmit,
  loading = false,
}: ChangePasswordFormProps) {
  const t = useTranslations("auth.security.changePassword");
  const tErrors = useTranslations("auth.errors");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  if (loading) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--neutral-11)]">Loading password capabilities…</p>
      </section>
    );
  }

  if (!capability.hasPasswordAccount) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
            OAuth only
          </span>
        </div>

        <p className="text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      </section>
    );
  }

  function validate(): AuthErrorKey | null {
    if (newPassword.length < MIN_PASSWORD_LENGTH) return "passwordTooShort";
    if (newPassword !== confirmPassword) return "passwordsDontMatch";
    if (newPassword === currentPassword) return "samePassword";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    setErrorKey(null);

    const validationError = validate();
    if (validationError) {
      setErrorKey(validationError);
      return;
    }

    setPending(true);
    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ currentPassword, newPassword, revokeOtherSessions });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorId = "change-password-error";
  const successId = "change-password-success";
  const errorMessage = errorKey ? tErrors(errorKey) : null;

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          Credential attached
        </span>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-current"
          >
            {t("currentPasswordLabel")}
          </label>
          <input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="current-password"
            className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            id="change-password-current"
            name="currentPassword"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-new"
          >
            {t("newPasswordLabel")}
          </label>
          <input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            id="change-password-new"
            minLength={MIN_PASSWORD_LENGTH}
            name="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="change-password-confirm"
          >
            {t("confirmPasswordLabel")}
          </label>
          <input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            id="change-password-confirm"
            minLength={MIN_PASSWORD_LENGTH}
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        <label
          className="flex items-center gap-2 text-sm text-[var(--neutral-11)]"
          htmlFor="change-password-revoke"
        >
          <input
            checked={revokeOtherSessions}
            className="h-4 w-4 rounded border-[var(--neutral-7)] text-[var(--blue-9)] focus:ring-[var(--blue-9)]"
            id="change-password-revoke"
            name="revokeOtherSessions"
            onChange={(event) => setRevokeOtherSessions(event.target.checked)}
            type="checkbox"
          />
          {t("revokeOtherSessions")}
        </label>

        {errorMessage && (
          <p className="text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
            {errorMessage}
          </p>
        )}

        {success && (
          <p
            className="text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
            id={successId}
            role="status"
          >
            {t("success")}
          </p>
        )}

        <div>
          <Button disabled={pending} htmlType="submit" type="primary">
            {t("submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
