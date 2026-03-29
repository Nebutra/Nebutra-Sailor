"use client";

import { Button, Input } from "@nebutra/ui/components";
import { Label, Separator } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OAuthButtons } from "./oauth-buttons";

type Phase = "details" | "verify";

export function SignUpForm() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lobehub v5 Input uses antd's InputRef, not HTMLInputElement
  const codeInputRef = useRef<any>(null);

  useEffect(() => {
    if (phase === "verify") {
      codeInputRef.current?.focus?.();
    }
  }, [phase]);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          (data as Record<string, string>).error ??
            (data as Record<string, Record<string, string>>).message ??
            "Sign up failed",
        );
        return;
      }

      // Better Auth auto-signs in after registration — skip email verification
      // and go directly to onboarding
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }

      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resending) return;

    setError("");
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError("Failed to resend code. Please try again.");
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (phase === "verify") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-[var(--neutral-9)]">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-[var(--neutral-11)]">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-code">Verification code</Label>
            <Input
              ref={codeInputRef}
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <Button htmlType="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--neutral-9)]">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)] disabled:opacity-50"
          >
            {resending ? "Resending…" : "Resend code"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-9)]">Start building today</p>
      </div>

      <OAuthButtons mode="signUp" />

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-[var(--neutral-9)]">
          Or continue with
        </span>
      </div>

      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

        <Button htmlType="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--neutral-9)]">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
