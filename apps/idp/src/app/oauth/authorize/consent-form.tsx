"use client";

/**
 * Consent Form — Client Component
 *
 * Handles the authorize/deny user actions and submits them
 * back to the oidc-provider interaction endpoint.
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
    <div className="gap-3 flex">
      <button
        type="button"
        onClick={() => handleConsent(false)}
        disabled={isLoading}
        className="border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white flex-1 rounded-xl border transition-[background-color,border-color,color,opacity] duration-150 disabled:opacity-50"
      >
        Deny
      </button>
      <button
        type="button"
        onClick={() => handleConsent(true)}
        disabled={isLoading}
        className="from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-blue-500/25 hover:shadow-blue-500/40 flex-1 rounded-xl bg-gradient-to-r shadow-lg transition-[box-shadow,opacity] duration-150 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="gap-2 inline-flex items-center">
            <svg
              aria-hidden="true"
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Authorizing…
          </span>
        ) : (
          "Authorize"
        )}
      </button>
    </div>
  );
}
