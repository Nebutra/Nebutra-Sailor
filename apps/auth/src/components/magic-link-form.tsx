"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { challengePath, writePendingAuth } from "@/lib/pending-auth";

interface MagicLinkFormProps {
  returnTo: string;
  turnstileSiteKey?: string;
}

export function MagicLinkForm({ returnTo, turnstileSiteKey }: MagicLinkFormProps) {
  const t = useTranslations("auth.magicLink");
  const tSignIn = useTranslations("auth.signIn");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = { email, callbackURL: returnTo };
      const cancelTo = `/sign-in/magic-link?returnTo=${encodeURIComponent(returnTo)}`;

      if (turnstileSiteKey) {
        writePendingAuth({
          kind: "magic-link",
          endpoint: "/api/auth/sign-in/magic-link",
          body,
          cancelTo,
        });
        router.push(challengePath(cancelTo));
        return;
      }

      const res = await fetch("/api/auth/sign-in/magic-link", {
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
        <Link href={signInHref} className="font-medium text-primary hover:text-primary">
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

        <Button type="submit" disabled={loading} variant="ink" className={AUTH_PRIMARY_CTA_CLASS}>
          {loading ? tSignIn("providerLoading") : t("send")}
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
