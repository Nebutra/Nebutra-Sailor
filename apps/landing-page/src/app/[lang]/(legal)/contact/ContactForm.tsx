"use client";

import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { type ContactFormState, submitContactForm } from "./actions";

const INITIAL_STATE: ContactFormState = { status: "idle" };

const CATEGORIES = [
  "general",
  "sales",
  "support",
  "legal",
  "privacy",
  "partnership",
  "press",
] as const;

export function ContactForm() {
  const t = useTranslations("legalPages");
  const [state, action, isPending] = useActionState(submitContactForm, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-primary/30 bg-primary/10 p-8 text-center">
        <p className="text-lg font-semibold text-primary">{t("contact.form.successMessage")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {state.status === "error" && (
        <div
          role="alert"
          className="rounded-[var(--radius-lg)] border border-[color:var(--red-8)]/40 bg-[color:var(--red-2)] px-4 py-3 text-sm text-[color:var(--red-11)] dark:border-[color:var(--red-7)]/40 dark:bg-[color:var(--red-2)] dark:text-[color:var(--red-9)]"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={`${t("contact.form.name")} *`} htmlFor="name">
          <Input id="name" name="name" required disabled={isPending} />
        </Field>
        <Field label={`${t("contact.form.email")} *`} htmlFor="email">
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("contact.form.company")} htmlFor="company">
          <Input id="company" name="company" disabled={isPending} />
        </Field>
        <Field label={`${t("contact.form.category")} *`} htmlFor="category">
          <Select name="category" defaultValue="general" disabled={isPending}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`contact.form.categories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={`${t("contact.form.subject")} *`} htmlFor="subject">
        <Input id="subject" name="subject" required disabled={isPending} />
      </Field>

      <Field label={`${t("contact.form.message")} *`} htmlFor="message">
        <Textarea id="message" name="message" rows={5} required disabled={isPending} />
      </Field>

      <div>
        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {isPending ? t("contact.form.submitting") : t("contact.form.submit")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("contact.form.privacyNotice")}{" "}
        <Link
          href="/privacy"
          className="text-[color:var(--blue-11)] hover:underline dark:text-[color:hsl(var(--primary))]"
        >
          {t("contact.form.privacyLink")}
        </Link>
        .
      </p>
    </form>
  );
}
