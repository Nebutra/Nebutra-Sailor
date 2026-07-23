"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface MagicLinkFormProps {
  returnTo: string;
  turnstileSiteKey?: string;
}

export function MagicLinkForm({ returnTo, turnstileSiteKey }: MagicLinkFormProps) {
  const t = useTranslations("auth.magicLink");
  const tSignIn = useTranslations("auth.signIn");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (turnstileToken) headers["x-captcha-response"] = turnstileToken;

      const res = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email, callbackURL: returnTo }),
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
          setError(data?.message || data?.error || tSignIn("genericError"));
        }
        return;
      }
      setSent(true);
    } catch {
      setError(tSignIn("genericError"));
    } finally {
      setLoading(false);
    }
  }

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  if (sent) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("sentTo", { email })}</p>
        </div>
        <Link
          href={signInHref}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
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

      {turnstileSiteKey ? (
        <div className="mb-4">
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{
              size: "invisible",
              appearance: "interaction-only",
              action: "turnstile-spin-v2",
            }}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="magic-email" className="text-sm font-medium text-foreground">
            {t("emailLabel")}
          </label>
          <Input
            id="magic-email"
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
          {loading ? tSignIn("providerLoading") : t("send")}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
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
