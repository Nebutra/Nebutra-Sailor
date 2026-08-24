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
      <p role="status" className="text-sm text-[color:var(--brand-accent)]">
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
      className="flex w-full min-w-0 max-w-[20rem] flex-col gap-2"
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
      {/*
        One control, not two boxes touching. The field and the submit used to be
        siblings that each drew their own stroke and their own right angles,
        which is what made the pair read as a form pasted into the footer. The
        group owns the fill and the focus ring; the field goes bare inside it.
        The pill is the same shape the header's theme toggle already uses.
      */}
      {/*
        --muted, not neutral-3: the footer sits on --background, and in dark mode
        the two ramps disagree in saturation, so a neutral-3 fill reads as navy
        against a near-neutral page.

        w-full + max-w-[20rem] on the form — not sm:w-[20rem] on this pill.
        The blog article aside is 280px with padding; a locked 20rem row shoved
        Subscribe off the card. Footer still gets the 20rem cap when it has room.
      */}
      <div className="flex w-full min-w-0 items-center gap-1 rounded-full bg-muted p-0.5 transition-shadow focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[hsl(var(--ring)/0.5)]">
        <Input
          type="email"
          size="sm"
          tone="bare"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletterPlaceholder")}
          aria-label={t("newsletterPlaceholder")}
          required
          className="min-h-11 min-w-0 flex-1 ps-3.5"
        />
        {/*
          Use ink (solid neutral-12 fill) — not default btn-brand-default.
          Brand default paints via background-image + primary-foreground text; when
          the gradient fails to paint, the CTA becomes white-on-white and "only the
          email field" is visible (footer newsletter regression).
          Ink matches the navbar high-contrast pattern.
        */}
        <Button
          type="submit"
          size="sm"
          variant="ink"
          disabled={status === "loading"}
          className="min-h-11 shrink-0 rounded-full px-4"
        >
          {status === "loading" ? "…" : t("newsletterSubscribe")}
        </Button>
      </div>
      {status === "error" && (
        <p role="alert" className="self-center text-xs text-destructive sm:ms-0">
          {t("newsletterError")}
        </p>
      )}
    </form>
  );
}
