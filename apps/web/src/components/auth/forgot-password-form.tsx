"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nebutra/ui/components";
import { Form, FormControl, FormField, FormItem, FormLabel, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const forgotPasswordSchema = z.object({
  email: z.string().email("invalidEmail"),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

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

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [serverErrorKey, setServerErrorKey] = useState<AuthErrorKey | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pending = form.formState.isSubmitting;

  async function handleSubmit({ email }: ForgotPasswordValues) {
    setServerErrorKey(null);

    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ email });
      setSubmitted(true);
    } catch (error) {
      setServerErrorKey(resolveAuthErrorKey(error));
    }
  }

  const validationErrorKey = form.formState.errors.email
    ? (form.formState.errors.email.message as AuthErrorKey | undefined)
    : undefined;
  const errorKey = serverErrorKey ?? validationErrorKey ?? null;
  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "forgot-password-error";

  if (submitted) {
    return (
      <section
        aria-live="polite"
        className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
      >
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("success")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
          {errorMessage}
        </p>
      )}

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="block text-sm font-medium text-[var(--neutral-12)]">
                  {t("emailLabel")}
                </FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="email" required type="email" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button disabled={pending} htmlType="submit" type="primary">
            {t("submit")}
          </Button>
        </form>
      </Form>
    </section>
  );
}
