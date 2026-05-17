"use client";

import { Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submitNewsletter() {
    if (!formRef.current?.reportValidity()) return;
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitNewsletter();
  }

  if (status === "success") {
    return (
      <p role="status" className="text-sm text-[color:var(--cyan-9)]">
        {t("newsletterSuccess")}
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      data-status={status}
      data-testid="newsletter-form"
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
        type="button"
        disabled={status === "loading"}
        onClick={() => void submitNewsletter()}
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
