"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";

// Mirrors the server-side guard in app/api/newsletter/route.ts so malformed
// addresses are rejected before the network round-trip.
const emailSchema = z.string().email();

export function NewsletterForm() {
  const t = useTranslations("footer");
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submitNewsletter() {
    if (!formRef.current?.reportValidity()) return;
    if (!emailSchema.safeParse(email.trim()).success) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }
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
      <Button type="submit" size="sm" disabled={status === "loading"}>
        {status === "loading" ? "…" : t("newsletterSubscribe")}
      </Button>
      {status === "error" && (
        <p role="alert" className="self-center text-xs text-red-500">
          {t("newsletterError")}
        </p>
      )}
    </form>
  );
}
