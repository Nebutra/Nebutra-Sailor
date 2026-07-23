// @brand-exempt: mirrors packages/platform/i18n auth.magicLink until next-intl on auth-center
"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useState } from "react";

interface MagicLinkFormProps {
  returnTo: string;
}

export function MagicLinkForm({ returnTo }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, callbackURL: returnTo }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        setError(data?.message || data?.error || "Could not send magic link.");
        return;
      }
      setSent(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  if (sent) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
            Check your email
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">
            We sent a sign-in link to{" "}
            <span className="font-medium text-[var(--neutral-12)]">{email}</span>.
          </p>
        </div>
        <Link
          href={signInHref}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          Email magic link
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">
          We&apos;ll email you a one-time link — no password needed.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={loading}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="magic-email" className="text-sm font-medium text-[var(--neutral-12)]">
            Email
          </label>
          <Input
            id="magic-email"
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
          {loading ? "Sending…" : "Send magic link"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        Prefer a password?{" "}
        <Link
          href={signInHref}
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
