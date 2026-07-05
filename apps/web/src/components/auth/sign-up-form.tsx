"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@nebutra/ui/components";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Label,
  Separator,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";
import { OAuthButtons } from "./oauth-buttons";

type Phase = "details" | "verify";

const detailsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  accessInviteCode: z.string(),
});
type DetailsValues = z.infer<typeof detailsSchema>;

interface SignUpFormProps {
  /** Server-sanitized returnUrl to land on after successful sign-up. */
  returnUrl?: string;
  /** OAuth providers actually configured server-side. */
  enabledOAuthProviders?: readonly OAuthProvider[];
}

const SIGN_UP_ERROR_COPY: Record<string, string> = {
  ACCESS_INVITE_REQUIRED: "A valid invite code is required to sign up.",
  INVALID_ACCESS_INVITE: "Invite code is invalid, expired, or not available.",
  ACCESS_INVITE_REDEMPTION_FAILED: "Invite redemption failed. Contact support before retrying.",
  USER_ALREADY_EXISTS: "An account already exists for this email. Sign in instead.",
  EMAIL_ALREADY_EXISTS: "An account already exists for this email. Sign in instead.",
  INVALID_EMAIL: "Enter a valid email address.",
  PASSWORD_TOO_SHORT: "Use a longer password.",
};

function extractSignUpError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Sign up failed. Please try again.";
  const data = payload as Record<string, unknown>;
  const code =
    typeof data.code === "string"
      ? data.code
      : typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : "";
  if (code && SIGN_UP_ERROR_COPY[code]) return SIGN_UP_ERROR_COPY[code];
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return "Sign up failed. Please try again.";
}

export function SignUpForm({ returnUrl, enabledOAuthProviders }: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessGateEnabled = process.env.NEXT_PUBLIC_ACCESS_GATE_MODE === "invite";
  const initialInviteCode = searchParams.get("invite") ?? "";
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const fallbackTarget = returnUrl ?? "/onboarding";
  const shouldRenderOAuth = !accessGateEnabled && (enabledOAuthProviders?.length ?? 0) > 0;

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      accessInviteCode: initialInviteCode,
    },
  });

  const [phase, _setPhase] = useState<Phase>("details");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: Lobehub v5 Input uses antd's InputRef, not HTMLInputElement.
  const codeInputRef = useRef<any>(null);

  const accessInviteCode = form.watch("accessInviteCode");
  const email = form.watch("email");
  const loading = form.formState.isSubmitting;

  useEffect(() => {
    if (phase === "verify") {
      codeInputRef.current?.focus?.();
    }
  }, [phase]);

  async function handleDetailsSubmit(values: DetailsValues) {
    setError("");

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${values.firstName} ${values.lastName}`.trim(),
          email: values.email,
          password: values.password,
          ...(accessGateEnabled ? { accessInviteCode: values.accessInviteCode, tenantId } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(extractSignUpError(data));
        return;
      }

      // Better Auth auto-signs in after registration — skip email verification
      // and go directly to onboarding
      router.push(fallbackTarget);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

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

      router.push(fallbackTarget);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
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

      {accessGateEnabled ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-3 py-2 text-sm text-[var(--neutral-10)]">
          Social sign-up is disabled while invite-only access is enabled. Use email sign-up with
          your invite code.
        </p>
      ) : shouldRenderOAuth ? (
        <>
          <OAuthButtons mode="signUp" providers={enabledOAuthProviders} returnUrl={returnUrl} />

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-[var(--neutral-9)]">
              Or continue with
            </span>
          </div>
        </>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleDetailsSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1.5 space-y-0">
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} required autoComplete="given-name" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1.5 space-y-0">
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} required autoComplete="family-name" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5 space-y-0">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5 space-y-0">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" required autoComplete="new-password" />
                </FormControl>
              </FormItem>
            )}
          />

          {accessGateEnabled ? (
            <FormField
              control={form.control}
              name="accessInviteCode"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1.5 space-y-0">
                  <FormLabel>Invite code</FormLabel>
                  <FormControl>
                    <Input {...field} required autoComplete="off" placeholder="neb_..." />
                  </FormControl>
                  <p className="text-xs text-[var(--neutral-9)]">
                    Nebutra is invite-only while the cold-start gate is enabled.
                  </p>
                </FormItem>
              )}
            />
          ) : null}

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <Button
            htmlType="submit"
            className="w-full"
            disabled={loading || (accessGateEnabled && !accessInviteCode.trim())}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-[var(--neutral-9)]">
        Already have an account?{" "}
        <Link
          href={
            returnUrl ? `/sign-in?${new URLSearchParams({ returnUrl }).toString()}` : "/sign-in"
          }
          className="font-medium text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
