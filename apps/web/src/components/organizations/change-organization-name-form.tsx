"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;

interface ChangeOrganizationNameFormProps {
  orgId: string;
  initialName: string;
  /** Override for tests — defaults to PATCH /api/organizations/[orgId]. */
  onSubmit?: (input: { name: string }) => Promise<{ name: string }>;
  onUpdated?: (next: { name: string }) => void;
}

async function defaultOnSubmit(orgId: string, input: { name: string }) {
  const response = await fetch(`/api/organizations/${orgId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    organization?: { name: string };
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    throw { code: payload.code, message: payload.error ?? "Failed to update organization name." };
  }
  return { name: payload.organization?.name ?? input.name };
}

export function ChangeOrganizationNameForm({
  orgId,
  initialName,
  onSubmit,
  onUpdated,
}: ChangeOrganizationNameFormProps) {
  const t = useTranslations();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const trimmed = name.trim();
  const canSubmit =
    !pending &&
    trimmed.length >= MIN_LENGTH &&
    trimmed.length <= MAX_LENGTH &&
    trimmed !== initialName;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setErrorMessage("");
    setShowSuccess(false);

    try {
      const submitter = onSubmit ?? ((input: { name: string }) => defaultOnSubmit(orgId, input));
      const next = await submitter({ name: trimmed });
      setShowSuccess(true);
      onUpdated?.(next);
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      const fallback =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : t(`auth.errors.${key}`);
      setErrorMessage(fallback);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <h3 className="text-sm font-medium text-[var(--neutral-12)]">
        {t("organizations.settings.name.title")}
      </h3>
      <p className="mt-1 mb-4 text-sm text-[var(--neutral-11)]">
        {t("organizations.settings.name.description")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="organization-name"
            className="text-sm font-medium text-[var(--neutral-12)]"
          >
            {t("organizations.settings.name.label")}
          </label>
          <input
            id="organization-name"
            name="name"
            type="text"
            autoComplete="off"
            minLength={MIN_LENGTH}
            maxLength={MAX_LENGTH}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setShowSuccess(false);
            }}
            disabled={pending}
            className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] disabled:opacity-50"
          />
        </div>

        {errorMessage && <p className="text-sm text-[var(--status-danger)]">{errorMessage}</p>}
        {showSuccess && (
          <p className="text-sm text-[color:var(--status-success)]">
            {t("organizations.settings.name.success")}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {pending
              ? t("organizations.settings.name.saving")
              : t("organizations.settings.name.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}
