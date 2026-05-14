"use client";

import { Button } from "@nebutra/ui/components";
import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const MIN_PASSWORD_LENGTH = 8;

export interface ResetPasswordSubmitInput {
  token: string;
  newPassword: string;
}

export interface ResetPasswordFormProps {
  token: string;
  /**
   * POST /api/auth/reset-password with `{ token, newPassword }` — overridable for testing.
   */
  onSubmit?: (input: ResetPasswordSubmitInput) => Promise<void>;
}

async function defaultSubmit({ token, newPassword }: ResetPasswordSubmitInput): Promise<void> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function ResetPasswordForm({ token, onSubmit }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorKey("passwordTooShort");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorKey("passwordsDontMatch");
      return;
    }

    setPending(true);
    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ token, newPassword });
      setSuccess(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "reset-password-error";

  if (success) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
      >
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("successDescription")}</p>
        <div className="mt-5">
          <Link
            href="/sign-in"
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center justify-center rounded-md bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
          >
            {t("signInCta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
          {errorMessage}
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-[var(--neutral-12)]"
            htmlFor="reset-password-new"
          >
            {t("newPasswordLabel")}
          </label>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            id="reset-password-new"
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
            htmlFor="reset-password-confirm"
          >
            {t("confirmPasswordLabel")}
          </label>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="new-password"
            id="reset-password-confirm"
            minLength={MIN_PASSWORD_LENGTH}
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        <Button disabled={pending} htmlType="submit" type="primary">
          {t("submit")}
        </Button>
      </form>
    </section>
  );
}
