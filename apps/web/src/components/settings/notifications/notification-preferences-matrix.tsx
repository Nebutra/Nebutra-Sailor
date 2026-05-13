"use client";

import type { NotificationChannel } from "@nebutra/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildPreferenceMatrix,
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_EVENT_TYPES,
  type NotificationEventTypeId,
  type NotificationPreferenceMap,
  type NotificationUserCapabilities,
  resetAllPreferences,
  togglePreferenceCell,
} from "@/lib/notification-preferences";
import { NotificationPreferencesRow } from "./notification-preferences-row";

type Translator = (key: string) => string;

export interface NotificationPreferencesMatrixProps {
  /**
   * Translator function. The page should pass `(key) => t(key)` from
   * `useTranslations()` so this stays a pure presentational client component.
   */
  t: Translator;
  capabilities: NotificationUserCapabilities;
  /**
   * Defaults to `/api/notifications/preferences`. Allows tests / storybook to
   * point the component at a different endpoint.
   */
  endpoint?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_ENDPOINT = "/api/notifications/preferences";

async function fetchPreferences(endpoint: string): Promise<NotificationPreferenceMap> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to load notification preferences: ${response.status}`);
  }
  const payload = (await response.json()) as {
    success: boolean;
    data?: { preferences?: NotificationPreferenceMap };
  };
  return payload.data?.preferences ?? {};
}

async function patchPreference(
  endpoint: string,
  body: { eventType: NotificationEventTypeId; channel: NotificationChannel; enabled: boolean },
): Promise<void> {
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`PATCH failed with ${response.status}`);
  }
  const payload = (await response.json()) as { success?: boolean };
  if (payload.success === false) {
    throw new Error("Server reported failure");
  }
}

function busyKey(eventType: NotificationEventTypeId, channel: NotificationChannel): string {
  return `${eventType}:${channel}`;
}

export function NotificationPreferencesMatrix({
  t,
  capabilities,
  endpoint = DEFAULT_ENDPOINT,
}: NotificationPreferencesMatrixProps) {
  const [preferences, setPreferences] = useState<NotificationPreferenceMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyCells, setBusyCells] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    fetchPreferences(endpoint)
      .then((next) => {
        if (cancelled) return;
        setPreferences(next);
        setLoadError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(t("settings.notifications.status.error"));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, t]);

  const matrix = useMemo(
    () => buildPreferenceMatrix({ preferences, capabilities }),
    [preferences, capabilities],
  );

  const visibleChannelIds = useMemo(
    () => matrix.channels.map((channel) => channel.id),
    [matrix.channels],
  );

  const channelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const channel of DEFAULT_NOTIFICATION_CHANNELS) {
      labels[channel.id] = t(`settings.notifications.channels.${channel.i18nKey}.label`);
    }
    return labels as Record<NotificationChannel, string>;
  }, [t]);

  const handleToggle = useCallback(
    async (eventType: NotificationEventTypeId, channel: NotificationChannel, enabled: boolean) => {
      const key = busyKey(eventType, channel);
      const previous = preferences;
      const optimistic = togglePreferenceCell(previous, eventType, channel, enabled);

      setPreferences(optimistic);
      setBusyCells((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
      setStatus("saving");

      try {
        await patchPreference(endpoint, { eventType, channel, enabled });
        setStatus("saved");
      } catch {
        // Revert
        setPreferences(previous);
        setStatus("error");
      } finally {
        setBusyCells((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [endpoint, preferences],
  );

  const handleResetAll = useCallback(() => {
    setPreferences(resetAllPreferences());
    setStatus("idle");
  }, []);

  if (loading) {
    return (
      <div
        data-testid="notification-preferences-loading"
        className="space-y-3 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--neutral-3)]" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 w-full animate-pulse rounded bg-[var(--neutral-2)]" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--neutral-12)]">
            {t("settings.notifications.title")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">
            {t("settings.notifications.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-live="polite"
            className="text-xs text-[var(--neutral-11)]"
            data-status={status}
          >
            {status === "saving" ? t("settings.notifications.status.saving") : null}
            {status === "saved" ? t("settings.notifications.status.saved") : null}
            {status === "error" ? t("settings.notifications.status.error") : null}
          </span>
          <button
            type="button"
            onClick={handleResetAll}
            className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-11)] hover:bg-[var(--neutral-2)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          >
            {t("settings.notifications.actions.resetAll")}
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-md border border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
          {loadError}
        </div>
      ) : null}

      {/* Header row — channel labels (desktop only) */}
      <div
        className="hidden gap-3 px-4 md:grid md:grid-cols-[2fr_repeat(var(--channel-count),minmax(0,1fr))]"
        style={{ ["--channel-count" as string]: visibleChannelIds.length }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
          {/* spacer for event-type column */}
        </span>
        {visibleChannelIds.map((channelId) => (
          <span
            key={channelId}
            className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]"
          >
            {channelLabels[channelId]}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {matrix.rows.map((row) => {
          const definition = DEFAULT_NOTIFICATION_EVENT_TYPES.find((entry) => entry.id === row.id);
          if (!definition) return null;

          return (
            <NotificationPreferencesRow
              key={row.id}
              eventTypeId={row.id}
              label={t(`settings.notifications.eventTypes.${definition.i18nKey}.label`)}
              description={t(`settings.notifications.eventTypes.${definition.i18nKey}.description`)}
              cells={row.cells}
              visibleChannelIds={visibleChannelIds}
              channelLabels={channelLabels}
              busyCells={busyCells}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
    </section>
  );
}
