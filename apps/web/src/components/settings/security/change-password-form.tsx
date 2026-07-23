"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nebutra/ui/components";
import { Form, FormControl, FormField, FormItem, FormLabel, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";
import type { SecurityCapabilities } from "./security-capabilities";

const MIN_PASSWORD_LENGTH = 8;

export interface ChangePasswordSubmitInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}

interface ChangePasswordFormProps {
  capability: SecurityCapabilities["password"];
  /** Optional override for testing — defaults to fetch POST /api/auth/change-password */
  onSubmit?: (input: ChangePasswordSubmitInput) => Promise<void>;
  /** When true, the parent is still resolving capabilities; show a skeleton. */
  loading?: boolean;
}

async function defaultSubmit(input: ChangePasswordSubmitInput): Promise<void> {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

// Field-validation bounds live in the schema; messages carry the stable AuthErrorKey
// so the existing error-catalog banner can localize them identically to before.
const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "passwordTooShort" satisfies AuthErrorKey,
      });
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "passwordsDontMatch" satisfies AuthErrorKey,
      });
      return;
    }
    if (values.newPassword === values.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "samePassword" satisfies AuthErrorKey,
      });
    }
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const DEFAULT_VALUES: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  revokeOtherSessions: true,
};

export function ChangePasswordForm({
  capability,
  onSubmit,
  loading = false,
}: ChangePasswordFormProps) {
  const t = useTranslations("auth.security.changePassword");
  const tErrors = useTranslations("auth.errors");

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [success, setSuccess] = useState(false);

  const pending = form.formState.isSubmitting;

  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Loading password capabilities…</p>
      </section>
    );
  }

  if (!capability.hasPasswordAccount) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check whether this account has a credential sign-in method and explain the safest
              supported password path.
            </p>
          </div>
          <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            OAuth only
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{capability.reason}</p>
      </section>
    );
  }

  async function onValidSubmit(values: ChangePasswordValues) {
    setErrorKey(null);
    setSuccess(false);

    try {
      const submit = onSubmit ?? defaultSubmit;
      await submit({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      });
      setSuccess(true);
      form.reset(DEFAULT_VALUES);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ChangePasswordValues>) {
    setSuccess(false);
    const message = errors.newPassword?.message;
    setErrorKey((message as AuthErrorKey | undefined) ?? "unknown");
  }

  const errorId = "change-password-error";
  const successId = "change-password-success";
  const errorMessage = errorKey ? tErrors(errorKey) : null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Credential attached
        </span>
      </div>

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="block text-sm font-medium text-foreground">
                  {t("currentPasswordLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-describedby={errorMessage ? errorId : undefined}
                    aria-invalid={Boolean(errorMessage)}
                    autoComplete="current-password"
                    name="currentPassword"
                    required
                    type="password"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="block text-sm font-medium text-foreground">
                  {t("newPasswordLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-describedby={errorMessage ? errorId : undefined}
                    aria-invalid={Boolean(errorMessage)}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    name="newPassword"
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
                <FormLabel className="block text-sm font-medium text-foreground">
                  {t("confirmPasswordLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-describedby={errorMessage ? errorId : undefined}
                    aria-invalid={Boolean(errorMessage)}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <label
            className="flex items-center gap-2 text-sm text-muted-foreground"
            htmlFor="change-password-revoke"
          >
            <input
              data-allow-native
              className="size-4 rounded border-border text-[hsl(var(--primary))]"
              id="change-password-revoke"
              type="checkbox"
              {...form.register("revokeOtherSessions")}
            />
            {t("revokeOtherSessions")}
          </label>

          {errorMessage && (
            <p className="text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
              {errorMessage}
            </p>
          )}

          {success && (
            <p
              className="text-sm text-[var(--status-success,hsl(var(--success,142_71%_45%)))]"
              id={successId}
              role="status"
            >
              {t("success")}
            </p>
          )}

          {pending && (
            <p className="text-sm text-muted-foreground" role="status">
              {t("pending")}
            </p>
          )}

          <div>
            <Button disabled={pending} htmlType="submit" type="primary">
              {pending ? t("pending") : t("submit")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
