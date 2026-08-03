"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { challengePath, writePendingAuth } from "@/lib/pending-auth";

interface ForgotPasswordFormProps {
  returnTo: string;
  turnstileSiteKey?: string;
}

/**
 * Better Auth `forget-password` (British spelling on the API path).
 * Visual shell matches apps/web forgot-password page (split layout + title).
 * Turnstile runs on `/challenge` after submit so the form column stays aligned.
 */
export function ForgotPasswordForm({ returnTo, turnstileSiteKey }: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgotPassword");
  const tSignIn = useTranslations("auth.signIn");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const body = {
        email,
        redirectTo: `${origin}/reset-password`,
      };
      const cancelTo = `/forgot-password?returnTo=${encodeURIComponent(returnTo)}`;

      if (turnstileSiteKey) {
        writePendingAuth({
          kind: "forgot-password",
          endpoint: "/api/auth/forget-password",
          body,
          cancelTo,
        });
        router.push(challengePath(cancelTo));
        return;
      }

      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        setError(data?.message || data?.error || tSignIn("genericError"));
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("successTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("success")}</p>
        </div>
        <Link
          href={signInHref}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--foreground))] text-sm font-medium text-[hsl(var(--background))] hover:bg-[hsl(var(--muted-foreground))]"
        >
          {tSignIn("submit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
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
            className="h-12 border-border bg-background text-foreground shadow-none"
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
          className="h-11 w-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? tSignIn("providerLoading") : t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href={signInHref} className="font-medium text-primary hover:text-primary">
          {tSignIn("back")}
        </Link>
      </p>
    </div>
  );
}
