"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="text-sm text-[color:var(--cyan-9)]">{t("newsletterSuccess")}</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("newsletterPlaceholder")}
        aria-label={t("newsletterPlaceholder")}
        required
        className="w-full rounded-lg border border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] px-3 py-2 text-sm text-[color:var(--neutral-12)] placeholder:text-[color:var(--neutral-10)] sm:w-48 sm:py-1.5 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-[image:var(--brand-gradient)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
      >
        {status === "loading" ? "..." : t("newsletterSubscribe")}
      </button>
      {status === "error" && (
        <p role="alert" className="self-center text-xs text-red-500">
          {t("newsletterError")}
        </p>
      )}
    </form>
  );
}
