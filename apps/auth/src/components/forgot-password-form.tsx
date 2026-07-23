"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ForgotPasswordFormProps {
  returnTo: string;
  turnstileSiteKey?: string;
}

/**
 * Better Auth `forget-password` (British spelling on the API path).
 * Visual shell matches apps/web forgot-password page (split layout + title).
 */
export function ForgotPasswordForm({ returnTo, turnstileSiteKey }: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgotPassword");
  const tSignIn = useTranslations("auth.signIn");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (turnstileToken) headers["x-captcha-response"] = turnstileToken;

      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          email,
          redirectTo: `${origin}/reset-password`,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
          code?: string;
        } | null;
        const code = data?.code ?? data?.error;
        if (code === "VERIFICATION_FAILED" || code === "MISSING_RESPONSE") {
          setError(tSignIn("captchaError"));
        } else {
          setError(data?.message || data?.error || "Could not send reset email.");
        }
        return;
      }
      setSubmitted(true);
    } catch {
      setError(tSignIn("genericError"));
    } finally {
      setLoading(false);
    }
  }

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  if (submitted) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {t("successTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("success")}</p>
        </div>
        <Link
          href={signInHref}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--neutral-12)] text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
        >
          {tSignIn("submit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
      </div>

      {turnstileSiteKey ? (
        <Turnstile
          siteKey={turnstileSiteKey}
          options={{ size: "invisible", appearance: "interaction-only" }}
          onSuccess={setTurnstileToken}
          onError={() => setTurnstileToken(null)}
          onExpire={() => setTurnstileToken(null)}
        />
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-medium text-[var(--neutral-12)]">
            {t("emailLabel")}
          </label>
          <Input
            id="forgot-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder={tSignIn("emailPlaceholder")}
          />
        </div>

        {error ? (
          <p
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? tSignIn("providerLoading") : t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        <Link
          href={signInHref}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          {tSignIn("back")}
        </Link>
      </p>
    </div>
  );
}
