"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nebutra/ui/components";
import { Form, FormControl, FormField, FormItem, FormLabel, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

const CONFIRM_PHRASE = "DELETE";

const deleteAccountSchema = z.object({
  password: z.string().trim().min(1),
  confirm: z.literal(CONFIRM_PHRASE),
});
type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

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
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const form = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", confirm: "" as DeleteAccountValues["confirm"] },
  });

  const password = form.watch("password");
  const confirmText = form.watch("confirm");
  const pending = form.formState.isSubmitting;

  const canSubmit = !pending && password.trim().length > 0 && confirmText === CONFIRM_PHRASE;

  function resetForm() {
    setStage(1);
    setErrorMessage("");
    form.reset({ password: "", confirm: "" as DeleteAccountValues["confirm"] });
  }

  async function onValidSubmit(values: DeleteAccountValues) {
    setErrorMessage("");
    setSuccess(false);

    try {
      const submitter = onSubmit ?? defaultOnSubmit;
      await submitter({ password: values.password });
      setSuccess(true);
      onDeleted?.();
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      setErrorMessage(t(`auth.errors.${key}`));
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--neutral-1)] p-6">
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValidSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium text-[var(--neutral-12)]">
                    {t("auth.security.deleteAccount.passwordPrompt")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      disabled={pending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium text-[var(--neutral-12)]">
                    {t("auth.security.deleteAccount.confirmTextLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="text" autoComplete="off" disabled={pending} />
                  </FormControl>
                </FormItem>
              )}
            />

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
        </Form>
      )}
    </section>
  );
}
