"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;

const schema = z.object({
  name: z.string().trim().min(MIN_LENGTH).max(MAX_LENGTH),
});
type FormValues = z.infer<typeof schema>;

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
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: initialName },
  });

  const watchedName = form.watch("name");
  const trimmed = watchedName.trim();
  const pending = form.formState.isSubmitting;
  const canSubmit =
    !pending && form.formState.isValid && trimmed.length > 0 && trimmed !== initialName;

  async function submit(values: FormValues) {
    setErrorMessage("");
    setShowSuccess(false);

    const next = { name: values.name.trim() };
    try {
      const submitter = onSubmit ?? ((input: { name: string }) => defaultOnSubmit(orgId, input));
      const result = await submitter(next);
      setShowSuccess(true);
      onUpdated?.(result);
    } catch (err) {
      const key = resolveAuthErrorKey(err);
      const fallback =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : t(`auth.errors.${key}`);
      setErrorMessage(fallback);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <h3 className="text-sm font-medium text-foreground">
        {t("organizations.settings.name.title")}
      </h3>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {t("organizations.settings.name.description")}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel
                  htmlFor="organization-name"
                  className="text-sm font-medium text-foreground"
                >
                  {t("organizations.settings.name.label")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="organization-name"
                    type="text"
                    autoComplete="off"
                    minLength={MIN_LENGTH}
                    maxLength={MAX_LENGTH}
                    disabled={pending}
                    onChange={(event) => {
                      field.onChange(event);
                      setShowSuccess(false);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMessage && <p className="text-sm text-[var(--status-danger)]">{errorMessage}</p>}
          {showSuccess && (
            <p className="text-sm text-[color:var(--status-success)]">
              {t("organizations.settings.name.success")}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: "hsl(var(--primary))" }}
            >
              {pending
                ? t("organizations.settings.name.saving")
                : t("organizations.settings.name.submit")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
