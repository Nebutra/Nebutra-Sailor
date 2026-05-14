"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { type ContactFormState, submitContactForm } from "./actions";

const INITIAL_STATE: ContactFormState = { status: "idle" };

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
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--neutral-11)]">
            {t("contact.form.name")} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isPending}
            className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--neutral-11)]">
            {t("contact.form.email")} *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={isPending}
            className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-[var(--neutral-11)]">
            {t("contact.form.company")}
          </label>
          <input
            type="text"
            id="company"
            name="company"
            disabled={isPending}
            className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--neutral-11)]">
            {t("contact.form.category")} *
          </label>
          <select
            id="category"
            name="category"
            required
            disabled={isPending}
            className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
          >
            <option value="general">{t("contact.form.categories.general")}</option>
            <option value="sales">{t("contact.form.categories.sales")}</option>
            <option value="support">{t("contact.form.categories.support")}</option>
            <option value="legal">{t("contact.form.categories.legal")}</option>
            <option value="privacy">{t("contact.form.categories.privacy")}</option>
            <option value="partnership">{t("contact.form.categories.partnership")}</option>
            <option value="press">{t("contact.form.categories.press")}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-[var(--neutral-11)]">
          {t("contact.form.subject")} *
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-[var(--neutral-11)]">
          {t("contact.form.message")} *
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-[var(--neutral-12)] focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-60 dark:text-white"
        />
      </div>

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
