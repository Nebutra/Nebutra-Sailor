"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2, Mail, Megaphone, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * TEMPLATE — Communication preferences toggle list.
 *
 * Currently not wired to a live endpoint. Stored under `UserProfile.preferences`
 * JSONB (key namespace: `communication`). Activation path:
 *   1. GET /api/me/profile returns preferences.communication
 *   2. PATCH /api/me/profile with new preferences subtree
 *   3. Honor `taskAlerts` in /api/queue handler when enqueuing notifications
 *   4. Honor `productUpdates` / `ads` in marketing email worker
 *
 * Each row is a soft-typed key — adding a new preference does NOT require
 * a migration.
 */

export interface CommunicationPreferenceValue {
  productUpdates: boolean;
  taskAlerts: boolean;
  marketingEmails: boolean;
}

export const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferenceValue = {
  productUpdates: true,
  taskAlerts: true,
  marketingEmails: false,
};

interface PreferenceRow {
  key: keyof CommunicationPreferenceValue;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ROWS: PreferenceRow[] = [
  {
    key: "productUpdates",
    label: "Product updates",
    description: "Early access to feature releases, success stories, and changelog highlights.",
    icon: Sparkles,
  },
  {
    key: "taskAlerts",
    label: "Task completion alerts",
    description: "We'll email you when a long-running task finishes processing.",
    icon: Mail,
  },
  {
    key: "marketingEmails",
    label: "Marketing & promotional emails",
    description:
      "Occasional offers, partner promotions, and event invites. We never share your address.",
    icon: Megaphone,
  },
];

interface Props {
  value?: CommunicationPreferenceValue;
  /**
   * Async save handler called once per toggle. Templates default to a stub
   * that errors — keeps the form honest until the API is wired.
   */
  onSave?: (next: CommunicationPreferenceValue) => Promise<void>;
}

const DEFAULT_SAVE: NonNullable<Props["onSave"]> = async () => {
  throw new Error("Communication preferences are not enabled yet.");
};

export function CommunicationPreferences({
  value = DEFAULT_COMMUNICATION_PREFERENCES,
  onSave = DEFAULT_SAVE,
}: Props) {
  const [current, setCurrent] = useState<CommunicationPreferenceValue>(value);
  const [busyKey, setBusyKey] = useState<keyof CommunicationPreferenceValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (key: keyof CommunicationPreferenceValue) => {
      const next: CommunicationPreferenceValue = { ...current, [key]: !current[key] };
      // Optimistic update.
      setCurrent(next);
      setBusyKey(key);
      setError(null);
      try {
        await onSave(next);
      } catch (err) {
        // Rollback on failure.
        setCurrent(current);
        setError(err instanceof Error ? err.message : "Failed to save preference");
      } finally {
        setBusyKey(null);
      }
    },
    [current, onSave],
  );

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
          Communication preferences
        </h2>
        <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
          Decide what reaches your inbox. You can change these anytime.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-7 dark:border-white/10">
        <ul className="divide-y divide-neutral-6 dark:divide-white/10">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const checked = current[row.key];
            const isBusy = busyKey === row.key;
            return (
              <li
                key={row.key}
                className="flex items-start justify-between gap-4 bg-neutral-1 px-4 py-3 dark:bg-white/[0.02]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-2 text-neutral-11 dark:bg-white/10 dark:text-white/60">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-12 dark:text-white">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-10 dark:text-white/50">
                      {row.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={`Toggle ${row.label}`}
                  disabled={isBusy}
                  onClick={() => void handleToggle(row.key)}
                  className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-8 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked ? "bg-blue-9" : "bg-neutral-6 dark:bg-white/15"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        checked ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
