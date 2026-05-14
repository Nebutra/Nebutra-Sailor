"use client";

import { Button } from "@nebutra/ui/components";
import { Input } from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

interface DeleteOrganizationFormProps {
  orgId: string;
  organizationName: string;
  /** Override for tests — defaults to DELETE /api/organizations/[orgId]. */
  onSubmit?: (input: { confirmation: string }) => Promise<void>;
  onDeleted?: () => void;
}

async function defaultOnSubmit(orgId: string, input: { confirmation: string }): Promise<void> {
  const response = await fetch(`/api/organizations/${orgId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw payload ?? { code: "UNKNOWN" };
  }
}

export function DeleteOrganizationForm({
  orgId,
  organizationName,
  onSubmit,
  onDeleted,
}: DeleteOrganizationFormProps) {
  const t = useTranslations("organizations.settings.delete");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [stage, setStage] = useState<"idle" | "confirm">("idle");
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = !pending && confirmText === organizationName;

  function handleCancel() {
    setStage("idle");
    setConfirmText("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError("");

    try {
      const submit = onSubmit ?? ((input) => defaultOnSubmit(orgId, input));
      await submit({ confirmation: confirmText });
      setSuccess(true);
      onDeleted?.();
      router.push("/");
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      setError(tErrors(key));
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <p role="status" className="text-sm text-[var(--neutral-12)]">
          {t("success")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-red-6 bg-red-2 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-red-11">{t("title")}</h3>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      </div>

      {stage === "idle" ? (
        <Button htmlType="button" onClick={() => setStage("confirm")}>
          {t("trigger")}
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="delete-org-confirm"
              className="block text-sm font-medium text-[var(--neutral-12)]"
            >
              {t("confirmLabel")}
            </label>
            <Input
              id="delete-org-confirm"
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "delete-org-error" : undefined}
              disabled={pending}
            />
            <p className="mt-1 text-xs text-[var(--neutral-11)]">
              <span className="font-mono">{organizationName}</span>
            </p>
          </div>

          {error && (
            <p id="delete-org-error" role="alert" className="text-sm text-red-11">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button htmlType="submit" disabled={!canSubmit}>
              {t("submit")}
            </Button>
            <Button htmlType="button" variant="outlined" onClick={handleCancel} disabled={pending}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
