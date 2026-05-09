"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

const CONFIRM_PHRASE = "DELETE";

interface DeleteAccountFormProps {
  /**
   * Whether deletion is supported by the current provider. Pass
   * `capability.password.available` (or `true` if always allowed).
   */
  available: boolean;
  /**
   * Override for testing — defaults to `fetch("/api/auth/delete-user", ...)`
   * with `{ password }` as the JSON body.
   */
  onSubmit?: (input: { password: string }) => Promise<void>;
  /**
   * Called after successful deletion (e.g. parent triggers redirect to /goodbye).
   */
  onDeleted?: () => void;
}

async function defaultOnSubmit(input: { password: string }): Promise<void> {
  const response = await fetch("/api/auth/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: string;
      error?: string;
      message?: string;
    } | null;
    const error: Record<string, unknown> = {
      code: payload?.code,
      message: payload?.error || payload?.message || "Failed to delete account.",
    };
    throw error;
  }
}

export function DeleteAccountForm({ available, onSubmit, onDeleted }: DeleteAccountFormProps) {
  const t = useTranslations();
  const [stage, setStage] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = !pending && password.trim().length > 0 && confirmText === CONFIRM_PHRASE;

  function resetForm() {
    setStage(1);
    setPassword("");
    setConfirmText("");
    setErrorMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setErrorMessage("");
    setSuccess(false);

    try {
      const submitter = onSubmit ?? defaultOnSubmit;
      await submitter({ password });
      setSuccess(true);
      onDeleted?.();
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      setErrorMessage(t(`auth.errors.${key}`));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--status-danger)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--status-danger)]">
            {t("auth.security.deleteAccount.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            {t("auth.security.deleteAccount.description")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {available ? t("auth.security.deleteAccount.title") : "Provider managed"}
        </span>
      </div>

      {!available ? (
        <p className="text-sm text-[var(--neutral-11)]">{t("auth.security.managedByProvider")}</p>
      ) : success ? (
        <p className="text-sm text-[var(--neutral-11)]">
          {t("auth.security.deleteAccount.success")}
        </p>
      ) : stage === 1 ? (
        <div className="flex justify-end">
          <Button htmlType="button" onClick={() => setStage(2)} variant="outlined">
            {t("auth.security.deleteAccount.submit")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="delete-account-password"
              className="text-sm font-medium text-[var(--neutral-12)]"
            >
              {t("auth.security.deleteAccount.passwordPrompt")}
            </label>
            <input
              id="delete-account-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="delete-account-confirm"
              className="text-sm font-medium text-[var(--neutral-12)]"
            >
              {t("auth.security.deleteAccount.confirmTextLabel")}
            </label>
            <input
              id="delete-account-confirm"
              name="confirm"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--status-danger)] focus:ring-offset-1"
            />
          </div>

          {errorMessage && <p className="text-sm text-[var(--status-danger)]">{errorMessage}</p>}

          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <Button htmlType="button" onClick={resetForm} disabled={pending} variant="outlined">
              {t("auth.security.deleteAccount.cancel")}
            </Button>
            <Button htmlType="submit" disabled={!canSubmit} variant="filled">
              {t("auth.security.deleteAccount.submit")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
