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
    const hp = formRef.current.querySelector<HTMLInputElement>('input[name="website"]');
    if (hp?.value) {
      setStatus("success"); // silent drop for bots
      return;
    }
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
      className="flex w-full max-w-md flex-col gap-2 sm:max-w-none sm:w-auto sm:flex-row sm:items-center"
    >
      {/* G27 honeypot — bots fill hidden fields; humans never see it */}
      <input
        data-allow-native
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        defaultValue=""
      />
      <Input
        type="email"
        size="sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("newsletterPlaceholder")}
        aria-label={t("newsletterPlaceholder")}
        required
        className="min-h-11 w-full sm:w-48 sm:shrink-0"
      />
      {/*
        Use ink (solid neutral-12 fill) — not default btn-brand-default.
        Brand default paints via background-image + primary-foreground text; when
        the gradient fails to paint, the CTA becomes white-on-white and "only the
        email field" is visible (footer newsletter regression).
        Ink matches the navbar Loslegen high-contrast pattern.
      */}
      <Button
        type="submit"
        size="sm"
        variant="ink"
        disabled={status === "loading"}
        className="min-h-11 w-full shrink-0 sm:w-auto"
      >
        {status === "loading" ? "…" : t("newsletterSubscribe")}
      </Button>
      {status === "error" && (
        <p role="alert" className="self-center text-xs text-red-500 sm:ms-0">
          {t("newsletterError")}
        </p>
      )}
    </form>
  );
}
