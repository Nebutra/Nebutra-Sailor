"use client";

import { Eye, EyeOff } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useCapsLock } from "./use-caps-lock";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const tSignIn = useTranslations("auth.signIn");
  const tErrors = useTranslations("auth.errors");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { capsLockOn, onKeyEvent } = useCapsLock();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(tErrors("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(tErrors("passwordsDontMatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        setError(data?.message || data?.error || tSignIn("genericError"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(tSignIn("genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {t("successTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">
            {t("successDescription")}
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--neutral-12)] text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)]"
        >
          {t("signInCta")}
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

      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-sm font-medium text-[var(--neutral-12)]">
            {t("newPasswordLabel")}
          </label>
          <div className="relative">
            <Input
              id="new-password"
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyEvent}
              onKeyUp={onKeyEvent}
              autoComplete="new-password"
              size="lg"
              className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] pr-12 text-[var(--neutral-12)] shadow-none"
              placeholder={tSignIn("passwordPlaceholder")}
              aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? tSignIn("hidePassword") : tSignIn("showPassword")}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {capsLockOn ? (
            <p
              id="caps-lock-warning"
              role="status"
              aria-live="polite"
              className="mt-0.5 text-xs font-medium text-[color:var(--amber-11,var(--neutral-11))]"
            >
              {tSignIn("capsLockOn")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-[var(--neutral-12)]"
          >
            {t("confirmPasswordLabel")}
          </label>
          <Input
            id="confirm-password"
            required
            type={showPassword ? "text" : "password"}
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder={tSignIn("passwordPlaceholder")}
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
    </div>
  );
}
