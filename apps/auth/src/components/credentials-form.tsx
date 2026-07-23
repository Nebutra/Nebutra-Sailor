// @brand-exempt: login copy mirrors packages/platform/i18n auth.signIn until next-intl is wired on auth-center
"use client";

import { Eye, EyeOff } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useState } from "react";
import type { OAuthProvider } from "@/lib/oauth-providers";
import { OAuthButtons } from "./oauth-buttons";

interface CredentialsFormProps {
  mode: "sign-in" | "sign-up";
  /** Already-sanitized absolute return URL (computed on the server). */
  returnTo: string;
  /** Providers configured server-side (env secrets present). */
  enabledOAuthProviders?: readonly OAuthProvider[];
}

/**
 * Better Auth email/password form styled like apps/web SignInForm
 * (neutral token surfaces + design-system Input/Button + social OAuth).
 */
export function CredentialsForm({
  mode,
  returnTo,
  enabledOAuthProviders = [],
}: CredentialsFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
      const body =
        mode === "sign-in"
          ? { email, password, callbackURL: returnTo }
          : { email, password, name: name || email.split("@")[0], callbackURL: returnTo };

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

  const altHref =
    mode === "sign-in"
      ? `/sign-up?returnTo=${encodeURIComponent(returnTo)}`
      : `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

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

      {enabledOAuthProviders.length > 0 ? (
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-name" className="text-sm font-medium text-[var(--neutral-12)]">
              Name
            </label>
            <Input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              size="lg"
              className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
              placeholder="Your name"
            />
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
            autoComplete="email"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium text-[var(--neutral-12)]">
            Password
          </label>
          <div className="relative">
            <Input
              id="auth-password"
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              size="lg"
              className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] pr-12 text-[var(--neutral-12)] shadow-none"
              placeholder="Enter your password"
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

      <p className="mt-8 text-sm text-[var(--neutral-10)]">
        {mode === "sign-in" ? (
          <>
            New to Nebutra?{" "}
            <Link
              href={altHref}
              className="font-medium text-[var(--neutral-12)] underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={altHref}
              className="font-medium text-[var(--neutral-12)] underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
