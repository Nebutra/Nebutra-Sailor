"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "./button";
import { Form, FormField, FormItem, FormMessage, useZodForm } from "./form";
import { Input } from "./input";
import { Label } from "./label";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

// Schema defined inline for portability
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const form = useZodForm({
    schema: changePasswordSchema,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);

    const response = await fetch("/api/user/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    }).catch((error: unknown) => {
      console.error("Failed to change password:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("settings.profile.toast.passwordUpdateFailed"),
      );
      return null;
    });

    if (!response) {
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(error?.error || t("settings.profile.toast.passwordUpdateFailed"));
      setIsLoading(false);
      return;
    }

    toast.success(t("settings.profile.toast.passwordUpdated"));
    form.reset();
    setIsLoading(false);
  };

  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-background">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("settings.profile.password.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.profile.password.description")}
        </p>
      </div>

      <Form form={form} onSubmit={onSubmit} className="px-6 py-5">
        <div className="space-y-5">
          {/* Current Password */}
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <FormItem className="grid gap-2">
                <Label htmlFor="currentPassword" className="text-sm font-semibold text-foreground">
                  {t("settings.profile.password.fields.current.label")}
                </Label>
                <Input
                  {...field}
                  id="currentPassword"
                  type="password"
                  className={`max-w-md ${fieldState.error ? "border-red-500" : ""}`}
                  autoComplete="current-password"
                  placeholder={t("settings.profile.password.fields.current.placeholder")}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New Password */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <FormItem className="grid gap-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-foreground">
                  {t("settings.profile.password.fields.new.label")}
                </Label>
                <Input
                  {...field}
                  id="newPassword"
                  type="password"
                  className={`max-w-md ${fieldState.error ? "border-red-500" : ""}`}
                  autoComplete="new-password"
                  placeholder={t("settings.profile.password.fields.new.placeholder")}
                />
                {/* 密码强度指示器 */}
                <div className="max-w-md">
                  <PasswordStrengthIndicator
                    password={field.value}
                    showRequirements={true}
                    showFeedback={true}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                  {t("settings.profile.password.fields.confirm.label")}
                </Label>
                <Input
                  {...field}
                  id="confirmPassword"
                  type="password"
                  className={`max-w-md ${fieldState.error ? "border-red-500" : ""}`}
                  autoComplete="new-password"
                  placeholder={t("settings.profile.password.fields.confirm.placeholder")}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Button */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="submit"
              disabled={isLoading}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading
                ? t("settings.profile.password.actions.saving")
                : t("settings.profile.password.actions.submit")}
            </Button>
          </div>
        </div>
      </Form>
    </section>
  );
}
