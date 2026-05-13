"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailChangePayload {
  newEmail: string;
}

interface EmailChangeResponse {
  ok: boolean;
  verificationSent?: boolean;
  newEmail?: string;
}

interface EmailChangeFormProps {
  /** Override the API call for testing. */
  requestEmailChange?: (payload: EmailChangePayload) => Promise<EmailChangeResponse>;
}

async function defaultRequestEmailChange(
  payload: EmailChangePayload,
): Promise<EmailChangeResponse> {
  const response = await fetch("/api/account/email-change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to request email change.");
  }
  return (await response.json()) as EmailChangeResponse;
}

export function EmailChangeForm({
  requestEmailChange = defaultRequestEmailChange,
}: EmailChangeFormProps = {}) {
  const t = useTranslations("account.emailChange");
  const inputId = useId();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t("errorInvalidEmail"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestEmailChange({ newEmail: trimmed });
      if (!result.ok) {
        throw new Error(t("error"));
      }
      setSentTo(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="email-change-heading"
      className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
    >
      <h2 id="email-change-heading" className="text-base font-semibold text-[var(--neutral-12)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("description")}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--neutral-12)]">
            {t("newEmailLabel")}
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="email"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("newEmailPlaceholder")}
            className="mt-1 w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || value.trim() === ""}
          className="inline-flex items-center justify-center rounded-md bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>

      {sentTo ? (
        <p className="mt-3 text-sm text-[color:var(--status-success)]" role="status">
          {t("verificationSent", { email: sentTo })}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
