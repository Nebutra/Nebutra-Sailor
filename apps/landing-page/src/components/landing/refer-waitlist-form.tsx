"use client";

import { ArrowRight, Check, Copy, Share } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import { type FormEvent, useId, useState } from "react";
import { z } from "zod";

const emailSchema = z.string().email();

export type ReferWaitlistFormCopy = {
  emailLabel: string;
  emailPlaceholder: string;
  codeLabel: string;
  codePlaceholder: string;
  submit: string;
  submitting: string;
  invalidEmail: string;
  error: string;
  successTitle: string;
  successDescription: string;
  positionLabel: string;
  referralCodeLabel: string;
  referralUrlLabel: string;
  copyLink: string;
  copied: string;
  share: string;
  shareTitle: string;
  shareText: string;
  directMode: string;
  codeMode: string;
};

type WaitlistJoinResponse = {
  success: true;
  entry: {
    email: string;
    position: number;
    referralCode: string;
    referralUrl: string;
    referralCount: number;
    referredBy: string | null;
    status: "waiting" | "admitted";
  };
};

type FormStatus = "idle" | "loading" | "success" | "error";

export function ReferWaitlistForm({
  initialCode,
  copy,
}: {
  initialCode: string | null;
  copy: ReferWaitlistFormCopy;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState(copy.error);
  const [result, setResult] = useState<WaitlistJoinResponse["entry"] | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const emailId = useId();
  const codeId = useId();

  async function submitWaitlist() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailSchema.safeParse(normalizedEmail).success) {
      setErrorMessage(copy.invalidEmail);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(copy.error);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: code.trim() || null,
          landingPage: window.location.href,
        }),
      });

      if (!res.ok) {
        throw new Error(`Waitlist API rejected with ${res.status}`);
      }

      const body = (await res.json()) as WaitlistJoinResponse;
      setResult(body.entry);
      setStatus("success");
    } catch {
      setErrorMessage(copy.error);
      setStatus("error");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitWaitlist();
  }

  async function copyReferralLink() {
    if (!result?.referralUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(result.referralUrl);
    setHasCopied(true);
  }

  async function shareReferralLink() {
    if (!result?.referralUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: copy.shareTitle,
        text: copy.shareText,
        url: result.referralUrl,
      });
      return;
    }
    await copyReferralLink();
  }

  if (status === "success" && result) {
    return (
      <section
        aria-labelledby="refer-success-title"
        className="w-full rounded-[var(--radius-lg)] border border-[color:var(--neutral-6)] bg-[color:var(--neutral-1)] p-4 shadow-sm md:p-6"
      >
        <div role="status" className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--green-3)] text-[color:var(--green-11)] ring-1 ring-[color:var(--green-6)]">
            <Check aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2
              id="refer-success-title"
              className="text-lg font-semibold text-[color:var(--neutral-12)]"
            >
              {copy.successTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--neutral-10)]">
              {copy.successDescription}
            </p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-[color:var(--neutral-6)] border-y border-[color:var(--neutral-6)]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
            <dt className="text-sm text-[color:var(--neutral-10)]">{copy.positionLabel}</dt>
            <dd className="text-sm font-semibold text-[color:var(--neutral-12)]">
              {result.position}
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
            <dt className="text-sm text-[color:var(--neutral-10)]">{copy.referralCodeLabel}</dt>
            <dd className="font-mono text-sm font-semibold text-[color:var(--neutral-12)]">
              {result.referralCode}
            </dd>
          </div>
          <div className="py-4">
            <dt className="text-sm text-[color:var(--neutral-10)]">{copy.referralUrlLabel}</dt>
            <dd className="mt-2 break-all rounded-[var(--radius-md)] bg-[color:var(--neutral-3)] px-3 py-2 font-mono text-xs text-[color:var(--neutral-11)]">
              {result.referralUrl}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={copyReferralLink} className="gap-2">
            <Copy aria-hidden="true" className="h-4 w-4" />
            {hasCopied ? copy.copied : copy.copyLink}
          </Button>
          <Button type="button" variant="ink" onClick={shareReferralLink} className="gap-2">
            <Share aria-hidden="true" className="h-4 w-4" />
            {copy.share}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form
      data-status={status}
      onSubmit={handleSubmit}
      className="w-full rounded-[var(--radius-lg)] border border-[color:var(--neutral-6)] bg-[color:var(--neutral-1)] p-4 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--neutral-6)] pb-3 md:pb-4">
        <p className="text-sm font-medium text-[color:var(--neutral-12)]">
          {code ? copy.codeMode : copy.directMode}
        </p>
        <span className="h-2 w-2 rounded-full bg-[color:var(--green-9)]" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-4 md:mt-5">
        <label className="grid gap-2" htmlFor={emailId}>
          <span className="text-sm font-medium text-[color:var(--neutral-11)]">
            {copy.emailLabel}
          </span>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            aria-label={copy.emailLabel}
            required
            autoComplete="email"
            className="min-h-11 md:min-h-12"
          />
        </label>

        <label className="grid gap-2" htmlFor={codeId}>
          <span className="text-sm font-medium text-[color:var(--neutral-11)]">
            {copy.codeLabel}
          </span>
          <Input
            id={codeId}
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={copy.codePlaceholder}
            aria-label={copy.codeLabel}
            autoComplete="off"
            className="min-h-11 font-mono uppercase md:min-h-12"
          />
        </label>
      </div>

      <Button
        type="submit"
        variant="ink"
        disabled={status === "loading"}
        className="mt-4 min-h-11 w-full gap-2 md:mt-5 md:min-h-12"
      >
        {status === "loading" ? copy.submitting : copy.submit}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Button>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-[color:var(--red-10)]">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
