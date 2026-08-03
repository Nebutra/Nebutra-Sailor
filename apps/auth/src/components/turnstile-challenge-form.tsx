"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { clearPendingAuth, type PendingAuth, readPendingAuth } from "@/lib/pending-auth";

interface TurnstileChallengeFormProps {
  turnstileSiteKey: string;
  /** Fallback when sessionStorage is empty or cancelTo is missing. */
  cancelTo: string;
}

/**
 * Full-panel Turnstile challenge. Credentials forms never mount the widget —
 * they write a short-lived pending request and send the user here so the
 * sign-in column stays aligned.
 */
export function TurnstileChallengeForm({
  turnstileSiteKey,
  cancelTo: cancelToProp,
}: TurnstileChallengeFormProps) {
  const t = useTranslations("auth.signIn");
  const tMagic = useTranslations("auth.magicLink");
  const tForgot = useTranslations("auth.forgotPassword");
  const router = useRouter();

  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doneKind, setDoneKind] = useState<"magic-link" | "forgot-password" | null>(null);
  const [doneEmail, setDoneEmail] = useState("");

  useEffect(() => {
    const handoff = readPendingAuth();
    if (!handoff) {
      router.replace(cancelToProp || "/sign-in");
      return;
    }
    setPending(handoff);
    setReady(true);
  }, [cancelToProp, router]);

  const cancelTo = pending?.cancelTo || cancelToProp || "/sign-in";

  async function completeWithToken(captchaToken: string) {
    if (!pending || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(pending.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-captcha-response": captchaToken,
        },
        credentials: "include",
        body: JSON.stringify(pending.body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
          code?: string;
        } | null;
        const code = data?.code ?? data?.error;
        if (code === "VERIFICATION_FAILED" || code === "MISSING_RESPONSE") {
          setError(t("captchaError"));
        } else {
          setError(data?.message || data?.error || t("genericError"));
        }
        setToken(null);
        setLoading(false);
        return;
      }

      clearPendingAuth();

      if (pending.kind === "magic-link") {
        setDoneEmail(String(pending.body.email ?? ""));
        setDoneKind("magic-link");
        setLoading(false);
        return;
      }
      if (pending.kind === "forgot-password") {
        setDoneKind("forgot-password");
        setLoading(false);
        return;
      }

      window.location.assign(pending.successRedirect || cancelTo);
    } catch {
      setError(t("genericError"));
      setToken(null);
      setLoading(false);
    }
  }

  function onTurnstileSuccess(value: string) {
    setToken(value);
    void completeWithToken(value);
  }

  if (doneKind === "magic-link") {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {tMagic("title")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {tMagic("sentTo", { email: doneEmail })}
          </p>
        </div>
        <Link href={cancelTo} className="font-medium text-primary hover:text-primary">
          {t("submit")}
        </Link>
      </div>
    );
  }

  if (doneKind === "forgot-password") {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {tForgot("successTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{tForgot("success")}</p>
        </div>
        <Link
          href={cancelTo}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--foreground))] text-sm font-medium text-[hsl(var(--background))] hover:bg-[hsl(var(--muted-foreground))]"
        >
          {t("submit")}
        </Link>
      </div>
    );
  }

  if (!ready || !pending) {
    return (
      <div className="w-full">
        <p className="text-sm text-muted-foreground">{t("providerLoading")}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("challengeTitle")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("challengeSubtitle")}</p>
      </div>

      <div className="flex flex-col items-stretch gap-5">
        {/*
          Dedicated page: use the managed checkbox widget so Cloudflare never
          has to inject a mid-form iframe that breaks the credentials column.
        */}
        <div className="flex min-h-[70px] items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted/40 px-3 py-4">
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{
              size: "normal",
              theme: "auto",
              action: "turnstile-spin-v2",
            }}
            onSuccess={onTurnstileSuccess}
            onError={() => {
              setToken(null);
              setError(t("captchaError"));
            }}
            onExpire={() => setToken(null)}
          />
        </div>

        {loading || token ? (
          <p className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            {t("challengeSubmitting")}
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          className="h-11 w-full"
          onClick={() => {
            clearPendingAuth();
            router.push(cancelTo);
          }}
        >
          {t("back")}
        </Button>
      </div>
    </div>
  );
}
