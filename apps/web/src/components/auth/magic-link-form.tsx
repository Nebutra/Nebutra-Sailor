"use client";

import { Button } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { resolveAuthErrorKey } from "@/lib/auth/error-catalog";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

const VERIFICATION_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MagicLinkSendInput {
  email: string;
}

export interface MagicLinkVerifyInput {
  email: string;
  code: string;
}

export interface MagicLinkFormProps {
  /** POST /api/auth/sign-in/magic-link with {email}. */
  onSendLink?: (input: MagicLinkSendInput) => Promise<void>;
  /** POST /api/auth/magic-link/verify with {email, code}. */
  onVerify?: (input: MagicLinkVerifyInput) => Promise<unknown>;
  /** Called with the verify response on success. */
  onSuccess?: (sessionData: unknown) => void;
}

async function defaultSendLink({ email }: MagicLinkSendInput): Promise<void> {
  const response = await fetch("/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
}

async function defaultVerify({ email, code }: MagicLinkVerifyInput): Promise<unknown> {
  const response = await fetch("/api/auth/magic-link/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    throw payload ?? { code: "UNKNOWN" };
  }
  return response.json().catch(() => null);
}

export function MagicLinkForm({ onSendLink, onVerify, onSuccess }: MagicLinkFormProps) {
  const t = useTranslations("auth.magicLink");
  const tErrors = useTranslations("auth.errors");

  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    if (!EMAIL_REGEX.test(email)) {
      setErrorKey("invalidEmail");
      return;
    }

    setPending(true);
    try {
      const submit = onSendLink ?? defaultSendLink;
      await submit({ email });
      setStage("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(submittedCode: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onVerify ?? defaultVerify;
      const result = await submit({ email, code: submittedCode });
      onSuccess?.(result);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
      verifyingRef.current = false;
    }
  }

  function handleCodeChange(value: string) {
    const digitsOnly = value.replace(/\D+/g, "").slice(0, VERIFICATION_CODE_LENGTH);
    setCode(digitsOnly);
    if (digitsOnly.length === VERIFICATION_CODE_LENGTH) {
      void handleVerify(digitsOnly);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setErrorKey(null);
    setPending(true);
    try {
      const submit = onSendLink ?? defaultSendLink;
      await submit({ email });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setPending(false);
    }
  }

  const errorMessage = errorKey ? tErrors(errorKey) : null;
  const errorId = "magic-link-error";

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-medium text-[var(--neutral-12)]">{t("title")}</h3>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      </div>

      {errorMessage && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" id={errorId} role="alert">
          {errorMessage}
        </p>
      )}

      {stage === "email" && (
        <form className="space-y-4" onSubmit={handleSend} noValidate>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[var(--neutral-12)]"
              htmlFor="magic-link-email"
            >
              {t("emailLabel")}
            </label>
            <input
              aria-describedby={errorMessage ? errorId : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="email"
              className="block w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              id="magic-link-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <Button disabled={pending} htmlType="submit" type="primary">
            {t("send")}
          </Button>
        </form>
      )}

      {stage === "code" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--neutral-11)]">{t("sentTo", { email })}</p>

          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[var(--neutral-12)]"
              htmlFor="magic-link-code"
            >
              {t("codeLabel")}
            </label>
            <input
              aria-describedby={errorMessage ? errorId : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="one-time-code"
              className="block w-40 rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-center font-mono text-base tracking-[0.4em] text-[var(--neutral-12)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
              id="magic-link-code"
              inputMode="numeric"
              maxLength={VERIFICATION_CODE_LENGTH}
              name="code"
              onChange={(event) => handleCodeChange(event.target.value)}
              pattern="\d{6}"
              required
              type="text"
              value={code}
            />
          </div>

          <Button
            disabled={cooldown > 0 || pending}
            htmlType="button"
            onClick={handleResend}
            variant="outlined"
          >
            {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resend")}
          </Button>
        </div>
      )}
    </section>
  );
}
