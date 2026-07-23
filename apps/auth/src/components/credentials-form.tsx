// @brand-exempt: login copy mirrors packages/platform/i18n auth.signIn until next-intl is wired on auth-center
"use client";

import { Warning as AlertTriangle, Eye, EyeOff, Key, Envelope as Mail } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useState } from "react";
import type { OAuthProvider } from "@/lib/oauth-providers";
import { OAuthButtons } from "./oauth-buttons";
import { useCapsLock } from "./use-caps-lock";

interface CredentialsFormProps {
  mode: "sign-in" | "sign-up";
  /** Already-sanitized absolute return URL (computed on the server). */
  returnTo: string;
  /** Providers configured server-side (env secrets present). */
  enabledOAuthProviders?: readonly OAuthProvider[];
  /** When true, show magic-link alternate entry (feature flag). */
  magicLinkEnabled?: boolean;
  /** When true, show passkey alternate entry (feature flag). */
  passkeyEnabled?: boolean;
}

/**
 * Full Agent OS / apps/web SignInForm parity for the login center:
 * OAuth, email/password, eye toggle, caps-lock, forgot-password, secondary methods.
 */
export function CredentialsForm({
  mode,
  returnTo,
  enabledOAuthProviders = [],
  magicLinkEnabled = false,
  passkeyEnabled = false,
}: CredentialsFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { capsLockOn, onKeyEvent } = useCapsLock();

  function withReturnTo(path: string): string {
    const params = new URLSearchParams({ returnTo });
    return `${path}?${params.toString()}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
      const name =
        mode === "sign-up"
          ? `${firstName} ${lastName}`.trim() || email.split("@")[0] || "User"
          : undefined;
      const body =
        mode === "sign-in"
          ? { email, password, callbackURL: returnTo }
          : { email, password, name, callbackURL: returnTo };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
          code?: string;
        } | null;
        setError(
          data?.message ||
            data?.error ||
            (mode === "sign-in" ? "Sign in failed" : "Sign up failed"),
        );
        return;
      }

      window.location.assign(returnTo);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setPasskeyLoading(true);
    setError(null);
    try {
      // Better Auth passkey start — browser navigates via conditional UI / client plugin when configured.
      const res = await fetch("/api/auth/sign-in/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(email ? { email } : {}),
      });
      if (!res.ok) {
        setError("Passkey sign-in is unavailable. Use email and password.");
        setPasskeyLoading(false);
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setError("Passkey sign-in failed. Use email and password.");
      setPasskeyLoading(false);
    }
  }

  const altHref = mode === "sign-in" ? withReturnTo("/sign-up") : withReturnTo("/sign-in");
  const showOAuth = enabledOAuthProviders.length > 0;
  const showAltMethods = mode === "sign-in" && (magicLinkEnabled || passkeyEnabled);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {mode === "sign-in" ? "Log in to Nebutra" : "Create your Nebutra account"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">
          {mode === "sign-in"
            ? "Choose how you want to sign in."
            : "One account for every Nebutra app."}
        </p>
      </div>

      {showOAuth ? (
        <>
          <OAuthButtons providers={enabledOAuthProviders} returnTo={returnTo} />
          <div className="relative my-6">
            <div className="h-px w-full bg-[var(--neutral-6)]" aria-hidden />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--neutral-1)] px-3 text-xs font-medium text-[var(--neutral-9)]">
              Or continue with email
            </span>
          </div>
        </>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        aria-busy={loading}
        aria-describedby={error ? "auth-form-error" : undefined}
      >
        {mode === "sign-up" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-first-name"
                className="text-sm font-medium text-[var(--neutral-12)]"
              >
                First name
              </label>
              <Input
                id="auth-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                size="lg"
                className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
                placeholder="First"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-last-name"
                className="text-sm font-medium text-[var(--neutral-12)]"
              >
                Last name
              </label>
              <Input
                id="auth-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                size="lg"
                className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
                placeholder="Last"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium text-[var(--neutral-12)]">
            Email
          </label>
          <Input
            id="auth-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={passkeyEnabled ? "username webauthn" : "email"}
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password" className="text-sm font-medium text-[var(--neutral-12)]">
              Password
            </label>
            {mode === "sign-in" ? (
              <Link
                href={withReturnTo("/forgot-password")}
                className="text-xs font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="auth-password"
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyEvent}
              onKeyUp={onKeyEvent}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              size="lg"
              className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] pr-12 text-[var(--neutral-12)] shadow-none"
              placeholder="Enter your password"
              aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-9)]"
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
              className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--amber-11,var(--neutral-11))]"
            >
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              Caps Lock is on
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            id="auth-form-error"
            className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading
            ? mode === "sign-in"
              ? "Signing in…"
              : "Creating account…"
            : mode === "sign-in"
              ? "Log in"
              : "Create account"}
        </Button>
      </form>

      {showAltMethods ? (
        <div className="mt-4 flex flex-col gap-2">
          {passkeyEnabled ? (
            <button
              type="button"
              onClick={() => void handlePasskey()}
              disabled={passkeyLoading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)] disabled:opacity-60"
            >
              <Key aria-hidden className="h-4 w-4" />
              {passkeyLoading ? "Redirecting…" : "Use a passkey"}
            </button>
          ) : null}
          {magicLinkEnabled ? (
            <Link
              href={withReturnTo("/sign-in/magic-link")}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              <Mail aria-hidden className="h-4 w-4" />
              Email me a magic link
            </Link>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        {mode === "sign-in" ? (
          <>
            New to Nebutra?{" "}
            <Link
              href={altHref}
              className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={altHref}
              className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
