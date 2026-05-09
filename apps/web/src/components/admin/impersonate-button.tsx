"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImpersonateButtonProps {
  userId: string;
  userLabel?: string;
  className?: string;
}

/**
 * Triggers admin impersonation. Asks for confirm() before posting to
 * /api/admin/impersonate. On success, refreshes the current route so the
 * (future) auth-layer cookie consumer can re-resolve the session.
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
        className="rounded-md border border-neutral-7 bg-neutral-2 px-2.5 py-1 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-3 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
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
