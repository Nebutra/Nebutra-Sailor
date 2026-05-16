"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

export interface SetPasswordSubmitInput {
  email: string;
}

export interface SetPasswordFormProps {
  email: string;
  /** Optional override for testing — defaults to fetch POST /api/auth/forget-password. */
  onSubmit?: (input: SetPasswordSubmitInput) => Promise<void>;
}

async function defaultSubmit(input: SetPasswordSubmitInput): Promise<void> {
  const response = await fetch("/api/auth/forget-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: input.email,
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function SetPasswordForm({ email, onSubmit }: SetPasswordFormProps) {
  const t = useTranslations("auth.security.setPassword");
  const tErrors = useTranslations("auth.errors");

  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  async function requestPasswordSetup() {
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ email });
      setStage("sent");
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
        </div>
      </div>

      {errorMessage && (
        <p
          className="mb-4 text-sm text-[hsl(var(--destructive))]"
          id="set-password-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {stage === "sent" ? (
        <p
          className="text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
          id="set-password-sent"
          role="status"
        >
          {t("sentMessage")}
        </p>
      ) : (
        <Button disabled={pending} htmlType="button" onClick={requestPasswordSetup} type="primary">
          {pending ? t("pending") : t("submit")}
        </Button>
      )}
      {pending && (
        <p className="mt-3 text-sm text-[var(--neutral-11)]" role="status">
          {t("pending")}
        </p>
      )}
    </section>
  );
}
