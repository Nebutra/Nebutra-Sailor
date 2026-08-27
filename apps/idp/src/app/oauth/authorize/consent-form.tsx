"use client";

/**
 * Consent Form — token-aligned actions (deny / authorize).
 */

import { useState } from "react";

interface ConsentFormProps {
  uid: string;
}

export function ConsentForm({ uid }: ConsentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleConsent(approved: boolean) {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/oidc/interaction/${uid}/${approved ? "confirm" : "abort"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const data = await response.json();
        if (data.redirectTo) {
          window.location.href = data.redirectTo;
        }
      }
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => handleConsent(false)}
        disabled={isLoading}
        className="flex-1 rounded-[var(--radius-lg)] border border-border bg-muted py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        Deny
      </button>
      <button
        type="button"
        onClick={() => handleConsent(true)}
        disabled={isLoading}
        className="flex-1 rounded-[var(--radius-lg)] bg-[hsl(var(--foreground))] py-3 text-sm font-semibold text-[hsl(var(--background))] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Authorizing…" : "Authorize"}
      </button>
    </div>
  );
}
