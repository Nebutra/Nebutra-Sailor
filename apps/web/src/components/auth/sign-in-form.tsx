"use client";

import { Button, Input, Label, Separator } from "@nebutra/ui/primitives";
import { AlertTriangle, Eye, EyeOff, Key, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OAuthButtons, type OAuthProvider } from "./oauth-buttons";
import { useCapsLock } from "./use-caps-lock";

interface SignInFormProps {
  /** OAuth providers actually configured server-side. */
  enabledOAuthProviders?: readonly OAuthProvider[];
  /** Server-sanitized returnUrl to land on after successful sign-in. */
  returnUrl?: string;
  /**
   * Whether to offer the magic-link route. Gate this on
   * `isAuthFeatureEnabled("magicLink")` server-side.
   */
  magicLinkEnabled?: boolean;
  /**
   * Whether to offer the passkey route. Gate this on
   * `isAuthFeatureEnabled("passkey")` server-side.
   */
  passkeyEnabled?: boolean;
}

export function SignInForm({
  enabledOAuthProviders,
  returnUrl,
  magicLinkEnabled = false,
  passkeyEnabled = false,
}: SignInFormProps) {
  const router = useRouter();
  const t = useTranslations("auth.signIn");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { capsLockOn, onKeyEvent } = useCapsLock();

  const fallbackTarget = returnUrl ?? "/";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    void fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnUrl: fallbackTarget }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response
            .json()
            .catch((): { error?: string } => ({ error: undefined }));
          setError(data.error ?? t("signInFailed"));
          setLoading(false);
          return;
        }

        router.push(fallbackTarget);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("genericError"));
        setLoading(false);
      });
  }

  function buildAltLink(path: string): string {
    if (!returnUrl) return path;
    const params = new URLSearchParams({ returnUrl });
    return `${path}?${params.toString()}`;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("subtitle")}</p>
      </div>

      <OAuthButtons mode="signIn" providers={enabledOAuthProviders} returnUrl={returnUrl} />

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--neutral-1)] px-3 text-xs font-medium text-[var(--neutral-9)]">
          {t("dividerOr")}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        aria-busy={loading}
        aria-describedby={error ? "sign-in-error" : undefined}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Link
              href={buildAltLink("/forgot-password")}
              className="text-xs font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              size="lg"
              className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] pr-12 text-[var(--neutral-12)] shadow-none"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyEvent}
              onKeyUp={onKeyEvent}
              required
              autoComplete="current-password"
              aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-9)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLockOn && (
            <p
              id="caps-lock-warning"
              role="status"
              aria-live="polite"
              className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--amber-11,var(--neutral-11))]"
            >
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              {t("capsLockOn")}
            </p>
          )}
        </div>

        {error && (
          <p
            id="sign-in-error"
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? t("submitLoading") : t("submit")}
        </Button>
      </form>

      {(magicLinkEnabled || passkeyEnabled) && (
        <div className="mt-4 flex flex-col gap-2">
          {magicLinkEnabled && (
            <Link
              href={buildAltLink("/sign-in/magic-link")}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              <Mail aria-hidden className="h-4 w-4" />
              {t("useMagicLink")}
            </Link>
          )}
          {passkeyEnabled && (
            <Link
              href={buildAltLink("/sign-in/passkey")}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              <Key aria-hidden className="h-4 w-4" />
              {t("usePasskey")}
            </Link>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        {t("newToProduct")}{" "}
        <Link
          href={buildAltLink("/sign-up")}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
