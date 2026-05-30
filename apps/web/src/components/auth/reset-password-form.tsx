"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nebutra/ui/components";
import { Form, FormControl, FormField, FormItem, FormLabel, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const MIN_PASSWORD_LENGTH = 8;

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordsDontMatch",
  });
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

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

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [success, setSuccess] = useState(false);

  const pending = form.formState.isSubmitting;

  async function onValidSubmit(values: ResetPasswordValues) {
    setErrorKey(null);
    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({ token, newPassword: values.newPassword });
      setSuccess(true);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ResetPasswordValues>) {
    const message = errors.newPassword?.message ?? errors.confirmPassword?.message;
    setErrorKey((message as AuthErrorKey | undefined) ?? null);
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "reset-password-error";

  if (success) {
    return (
      <section
        aria-live="polite"
        className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
      >
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("successDescription")}</p>
        <div className="mt-5">
          <Link
            href="/sign-in"
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
          >
            {t("signInCta")}
          </Link>
        </div>
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
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="block text-sm font-medium text-[var(--neutral-12)]">
                  {t("newPasswordLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    type="password"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="block text-sm font-medium text-[var(--neutral-12)]">
                  {t("confirmPasswordLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    type="password"
                  />
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
