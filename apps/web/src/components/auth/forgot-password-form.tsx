"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordSubmitInput {
  email: string;
}

export interface ForgotPasswordFormProps {
  /**
   * POST /api/auth/forget-password — overridable for testing.
   * Better-Auth's catch-all route serves this endpoint as `forget-password`
   * (note the British spelling without the "for" of "forgot").
   */
  onSubmit?: (input: ForgotPasswordSubmitInput) => Promise<void>;
}

async function defaultSubmit({ email }: ForgotPasswordSubmitInput): Promise<void> {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const response = await fetch("/api/auth/forget-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, redirectTo: `${origin}/reset-password` }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgotPassword");
  const tErrors = useTranslations("auth.errors");

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (!EMAIL_REGEX.test(email)) {
      setErrorKey("invalidEmail");
      return;
    }

    setPending(true);
    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ email });
      setSubmitted(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "forgot-password-error";

  if (submitted) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
      >
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("success")}</p>
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
            htmlFor="forgot-password-email"
          >
            {t("emailLabel")}
          </label>
          <input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="email"
            className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
            id="forgot-password-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>

        <Button disabled={pending} htmlType="submit" type="primary">
          {t("submit")}
        </Button>
      </form>
    </section>
  );
}
