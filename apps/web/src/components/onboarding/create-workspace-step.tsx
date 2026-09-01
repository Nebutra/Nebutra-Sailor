"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { brand } from "@nebutra/brand/metadata";
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
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ORGANIZATION_ERROR_CODES } from "@/lib/organization-errors";

interface CreateWorkspaceStepProps {
  onComplete: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

type Values = {
  name: string;
  slug: string;
};

interface WorkspaceSchemaMessages {
  nameRequired: string;
  slugError: string;
}

interface WorkspaceSubmitErrorMessages {
  error: string;
  providerUnsupported: string;
}

export function createWorkspaceSchema(messages: WorkspaceSchemaMessages) {
  return z.object({
    name: z.string().min(1, { message: messages.nameRequired }),
    slug: z
      .string()
      .refine((slug) => /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug) || slug.length >= 3, {
        message: messages.slugError,
      }),
  });
}

export function resolveWorkspaceSubmitError(
  payload: unknown,
  messages: WorkspaceSubmitErrorMessages,
): string {
  const code =
    payload && typeof payload === "object" && "code" in payload
      ? (payload as { code?: unknown }).code
      : undefined;

  return code === ORGANIZATION_ERROR_CODES.notEnabled
    ? messages.providerUnsupported
    : messages.error;
}

export function CreateWorkspaceStep({ onComplete }: CreateWorkspaceStepProps) {
  const t = useTranslations("onboarding.workspace");
  const router = useRouter();

  const schema = useMemo(
    () =>
      createWorkspaceSchema({
        nameRequired: t("nameRequired"),
        slugError: t("slugError"),
      }),
    [t],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
    mode: "onSubmit",
  });

  const { setError, watch, setValue, setFocus } = form;
  const name = watch("name");

  const slugDirty = form.getFieldState("slug").isDirty;
  useEffect(() => {
    if (!slugDirty) {
      setValue("slug", slugify(name));
    }
  }, [name, slugDirty, setValue]);

  useEffect(() => {
    setFocus("name");
  }, [setFocus]);

  async function submit(values: Values) {
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, slug: values.slug }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        setError("root", {
          message: resolveWorkspaceSubmitError(data, {
            error: t("error"),
            providerUnsupported: t("providerUnsupported"),
          }),
        });
        return;
      }

      const result = await response.json();
      if (result.organizationId) {
        router.refresh();
      }

      onComplete();
    } catch {
      setError("root", { message: t("error") });
    }
  }

  const loading = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel>{t("nameLabel")}</FormLabel>
                <FormControl>
                  <Input
                    size="lg"
                    className="h-12 border-border bg-background text-foreground shadow-none"
                    placeholder={t("namePlaceholder")}
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel>{t("urlLabel")}</FormLabel>
                <FormControl>
                  <Input
                    size="lg"
                    className="h-12 border-border bg-background text-foreground shadow-none"
                    placeholder={t("slugPlaceholder")}
                    pattern="[a-z0-9][a-z0-9\-]{1,46}[a-z0-9]"
                    required
                    {...field}
                    onChange={(e) => {
                      field.onChange(slugify(e.target.value) || e.target.value.toLowerCase());
                    }}
                  />
                </FormControl>
                <p className="text-xs leading-5 text-muted-foreground">
                  {brand.domains.app}/{field.value || t("slugPlaceholder")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {rootError ? (
            <p className="text-sm text-destructive" role="alert">
              {rootError}
            </p>
          ) : null}

          <Button type="submit" variant="ink" className={AUTH_PRIMARY_CTA_CLASS} disabled={loading}>
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
