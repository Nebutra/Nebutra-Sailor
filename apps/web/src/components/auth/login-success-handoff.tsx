"use client";

import { ArrowRight, Check, Clock, type Icon, Key, ShieldCheck } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface LoginSuccessHandoffProps {
  redirectTo?: string;
}

const REDIRECT_DELAY_SECONDS = 4;

export function LoginSuccessHandoff({ redirectTo = "/" }: LoginSuccessHandoffProps) {
  const router = useRouter();
  const t = useTranslations("auth.loginSuccess");
  const [secondsRemaining, setSecondsRemaining] = useState(REDIRECT_DELAY_SECONDS);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace(redirectTo);
    }, REDIRECT_DELAY_SECONDS * 1000);

    const countdownTimer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdownTimer);
    };
  }, [redirectTo, router]);

  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--blue-9),transparent)]"
      />

      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-success)_16%,transparent)] text-[color:var(--status-success)]">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--status-success)_35%,transparent)]"
          />
          <Check className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-normal text-[var(--neutral-10)]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--neutral-12)]">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        <StatusRow icon={ShieldCheck} label={t("session")} state={t("verified")} />
        <StatusRow icon={Key} label={t("workspace")} state={t("preparing")} muted />
      </div>

      <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--neutral-11)]">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {t("redirecting", { seconds: secondsRemaining })}
          </span>
          <span className="text-[var(--neutral-9)]">{t("secureHandoff")}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--neutral-5)]">
          <div className="h-full w-full origin-left animate-[login-success-progress_4s_linear_forwards] rounded-full bg-[var(--neutral-12)]" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="ink" className="w-full sm:flex-1">
          <a href={redirectTo}>
            {t("continueCta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </Button>
        <Button asChild variant="outline" className="w-full sm:flex-1">
          <a href="/sign-in">{t("signInCta")}</a>
        </Button>
      </div>
    </section>
  );
}

interface StatusRowProps {
  icon: Icon;
  label: string;
  state: string;
  muted?: boolean;
}

function StatusRow({ icon: Icon, label, state, muted = false }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-3 py-2.5">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--neutral-11)]">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            muted ? "text-[var(--neutral-9)]" : "text-[color:var(--status-success)]",
          )}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-[var(--neutral-10)]">{state}</span>
    </div>
  );
}
