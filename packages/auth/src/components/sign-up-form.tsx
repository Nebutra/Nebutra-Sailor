"use client";

import { type FormEvent, useState } from "react";

interface SignUpFormProps {
  onSubmit: (
    data: { name: string; email: string; password: string } | { method: "oauth"; provider: string },
  ) => Promise<{ error?: string }>;
  oauthProviders?: Array<{ id: string; name: string }>;
  signInUrl?: string;
}

export function SignUpForm({ onSubmit, oauthProviders, signInUrl = "/sign-in" }: SignUpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await onSubmit({ name, email, password });
      if (result.error) setError(result.error);
    } catch {
      setError("Account creation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: string) {
    setError("");
    try {
      const result = await onSubmit({ method: "oauth", provider });
      if (result.error) setError(result.error);
    } catch {
      setError("OAuth sign up failed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-9)]">Get started for free</p>
      </div>

      {oauthProviders && oauthProviders.length > 0 && (
        <>
          <div className="flex gap-3">
            {oauthProviders.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleOAuth(p.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2.5 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-[var(--neutral-7)]" />
            <span className="px-3 text-xs text-[var(--neutral-9)]">or continue with</span>
            <div className="flex-1 border-t border-[var(--neutral-7)]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-name" className="text-sm font-medium text-[var(--neutral-12)]">
            Name
          </label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium text-[var(--neutral-12)]">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium text-[var(--neutral-12)]">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-confirm" className="text-sm font-medium text-[var(--neutral-12)]">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--blue-9)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50"
        >
          {loading ? "Creating account\u2026" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--neutral-9)]">
        Already have an account?{" "}
        <a
          href={signInUrl}
          className="font-medium text-[var(--blue-11)] hover:text-[var(--blue-12)]"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}

export type { SignUpFormProps };
