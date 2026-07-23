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
        className="flex-1 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] py-3 text-sm font-medium text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)] disabled:opacity-50"
      >
        Deny
      </button>
      <button
        type="button"
        onClick={() => handleConsent(true)}
        disabled={isLoading}
        className="flex-1 rounded-[var(--radius-lg)] bg-[var(--neutral-12)] py-3 text-sm font-semibold text-[var(--neutral-1)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Authorizing…" : "Authorize"}
      </button>
    </div>
  );
}
