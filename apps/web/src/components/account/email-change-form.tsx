"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const emailChangeSchema = z.object({
  newEmail: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().email("errorInvalidEmail")),
});
type EmailChangeValues = z.input<typeof emailChangeSchema>;

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
  const form = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: "" },
  });
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const newEmail = form.watch("newEmail");
  const submitting = form.formState.isSubmitting;

  async function onValidSubmit(values: EmailChangeValues) {
    setError(null);
    const trimmed = values.newEmail.trim().toLowerCase();
    try {
      const result = await requestEmailChange({ newEmail: trimmed });
      if (!result.ok) {
        throw new Error(t("error"));
      }
      setSentTo(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  function onInvalidSubmit() {
    setError(t("errorInvalidEmail"));
  }

  return (
    <section
      aria-labelledby="email-change-heading"
      className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
    >
      <h2 id="email-change-heading" className="text-base font-semibold text-[var(--neutral-12)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("description")}</p>

      <Form {...form}>
        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium text-[var(--neutral-12)]">
                  {t("newEmailLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={t("newEmailPlaceholder")}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={submitting || newEmail.trim() === ""}
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("submitting") : t("submit")}
          </button>
        </form>
      </Form>

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
