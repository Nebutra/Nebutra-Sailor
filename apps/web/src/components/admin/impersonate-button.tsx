"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImpersonateButtonProps {
  userId: string;
  userLabel?: string;
  className?: string;
}

/**
 * Triggers admin impersonation via POST /api/admin/impersonate.
 *
 * Multi-provider matrix currently declares `impersonation: false` for all
 * providers — the API returns 501 with AUTH_CAPABILITY_UNSUPPORTED until an
 * adapter implements end-to-end support. This button surfaces that error
 * rather than faking a session swap.
 */
export function ImpersonateButton({ userId, userLabel, className }: ImpersonateButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    const ok = window.confirm(
      `Impersonate ${userLabel ?? userId}? You will see the app as this user until you stop.`,
    );
    if (!ok) return;

    setPending(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to start impersonation.");
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start impersonation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={`Impersonate ${userLabel ?? userId}`}
        className="rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-2 px-2.5 py-1 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-3 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Impersonate"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-[color:var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
