"use client";

import {
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
      <div className="rounded-[var(--radius-2xl)] border border-[color:var(--blue-8)] bg-[color:var(--blue-2)] p-8 text-center dark:border-[color:var(--blue-7)] dark:bg-[color:var(--blue-2)]">
        <p className="text-lg font-semibold text-[color:var(--blue-11)] dark:text-[color:var(--blue-9)]">
          {t("contact.form.successMessage")}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {state.status === "error" && (
        <div
          role="alert"
          className="rounded-[var(--radius-lg)] border border-[color:var(--red-8)] bg-[color:var(--red-2)] px-4 py-3 text-sm text-[color:var(--red-11)] dark:border-[color:var(--red-7)] dark:bg-[color:var(--red-2)] dark:text-[color:var(--red-9)]"
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
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[var(--radius-lg)] bg-[color:var(--blue-9)] px-6 py-3 font-semibold text-white transition hover:bg-[color:var(--blue-10)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("contact.form.submitting") : t("contact.form.submit")}
        </button>
      </div>

      <p className="text-sm text-[var(--neutral-9)]">
        {t("contact.form.privacyNotice")}{" "}
        <Link
          href="/privacy"
          className="text-[color:var(--blue-11)] hover:underline dark:text-[color:var(--blue-9)]"
        >
          {t("contact.form.privacyLink")}
        </Link>
        .
      </p>
    </form>
  );
}
