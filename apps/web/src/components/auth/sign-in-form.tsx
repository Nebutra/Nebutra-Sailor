"use client";

import { Button, Input, Label, Separator } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OAuthButtons } from "./oauth-buttons";

export function SignInForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    void fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response
            .json()
            .catch((): { error?: string } => ({ error: undefined }));
          setError(data.error ?? "Sign in failed");
          setLoading(false);
          return;
        }

        router.push("/");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        setLoading(false);
      });
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          Log in to Nebutra
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">Connect to Nebutra with:</p>
      </div>

      <OAuthButtons mode="signIn" />

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--neutral-1)] px-3 text-xs font-medium text-[var(--neutral-9)]">
          Or continue with
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        aria-busy={loading}
        aria-describedby={error ? "sign-in-error" : undefined}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/sign-in#/forgot-password"
              className="text-xs font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            size="lg"
            className="h-12 border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-none"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
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
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--neutral-9)]">
        New to Nebutra?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
