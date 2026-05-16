"use client";

import { Input } from "@nebutra/ui/primitives";
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
      <Input
        type="email"
        size="sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("newsletterPlaceholder")}
        aria-label={t("newsletterPlaceholder")}
        required
        className="sm:w-48"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="min-w-16 rounded-lg border border-[color:var(--blue-6)] bg-[color:var(--blue-2)] px-3 py-1.5 text-sm font-medium text-[color:var(--neutral-12)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:border-[color:var(--blue-7)] hover:bg-[color:var(--blue-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--blue-7)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--cyan-6)] dark:bg-[color:var(--cyan-2)] dark:text-[color:var(--neutral-12)] dark:hover:bg-[color:var(--cyan-3)]"
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
