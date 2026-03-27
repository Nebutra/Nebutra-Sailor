"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

interface PhoneLoginFormProps {
  onSendCode: (phone: string) => Promise<{ error?: string }>;
  onVerify: (phone: string, code: string) => Promise<{ error?: string }>;
  backUrl?: string;
}

const COOLDOWN_SECONDS = 60;

export function PhoneLoginForm({ onSendCode, onVerify, backUrl }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    clearTimer();
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!phone.trim() || cooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const result = await onSendCode(phone);
      if (result.error) {
        setError(result.error);
      } else {
        setCodeSent(true);
        startCooldown();
      }
    } catch {
      setError("Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await onVerify(phone, code);
      if (result.error) setError(result.error);
    } catch {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
          Phone sign in
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-9)]">
          We&apos;ll send a verification code to your phone
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone-number" className="text-sm font-medium text-[var(--neutral-12)]">
            Phone number
          </label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-3 text-sm text-[var(--neutral-11)]">
              +86
            </span>
            <input
              id="phone-number"
              type="tel"
              placeholder="138 0000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              className="flex-1 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || cooldown > 0 || !phone.trim()}
              className="whitespace-nowrap rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50"
            >
              {cooldown > 0 ? `${cooldown}s` : "Send Code"}
            </button>
          </div>
        </div>

        {codeSent && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sms-code" className="text-sm font-medium text-[var(--neutral-12)]">
              Verification code
            </label>
            <input
              id="sms-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-center text-lg tracking-[0.5em] text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        )}

        {codeSent && (
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="rounded-lg bg-[var(--blue-9)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50"
          >
            {loading ? "Verifying\u2026" : "Verify"}
          </button>
        )}
      </form>

      {backUrl && (
        <p className="text-center text-sm text-[var(--neutral-9)]">
          <a
            href={backUrl}
            className="font-medium text-[var(--blue-11)] hover:text-[var(--blue-12)]"
          >
            Back to sign in
          </a>
        </p>
      )}
    </div>
  );
}

export type { PhoneLoginFormProps };
