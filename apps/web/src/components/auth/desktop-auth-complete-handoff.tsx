"use client";

import { ArrowRight, Check, Clock, ShieldCheck } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import type React from "react";
import { useEffect } from "react";

interface DesktopAuthCompleteHandoffProps {
  redirectUrl: string;
  expiresAt: string;
}

export function DesktopAuthCompleteHandoff({
  redirectUrl,
  expiresAt,
}: DesktopAuthCompleteHandoffProps) {
  useEffect(() => {
    window.location.assign(redirectUrl);
  }, [redirectUrl]);

  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--blue-9),transparent)]"
      />

      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-success)_16%,transparent)] text-[color:var(--status-success)]">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--status-success)_35%,transparent)]"
          />
          <Check className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-normal text-[var(--neutral-10)]">
            Desktop sign-in
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--neutral-12)]">
            Opening Nebutra Foundry
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--neutral-10)]">
            Your browser created a short-lived desktop handoff. Continue in the app to finish
            sign-in.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        <StatusRow
          icon={<ShieldCheck className="h-4 w-4 text-[color:var(--status-success)]" />}
          label="Web session"
          state="Verified"
        />
        <StatusRow
          icon={<Clock className="h-4 w-4 text-[var(--neutral-9)]" />}
          label="Handoff expiry"
          state={new Date(expiresAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </div>

      <Button asChild variant="ink" className="mt-6 w-full">
        <a href={redirectUrl}>
          Open Nebutra Foundry
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </Button>
    </section>
  );
}

function StatusRow({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-3 py-2.5">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--neutral-11)]">
        <span className="shrink-0" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-[var(--neutral-10)]">{state}</span>
    </div>
  );
}
