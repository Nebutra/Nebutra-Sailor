"use client";

import type { NotificationChannel } from "@nebutra/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/query-keys";
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

type PreferencePatchInput = {
  eventType: NotificationEventTypeId;
  channel: NotificationChannel;
  enabled: boolean;
};

async function fetchPreferences(
  endpoint: string,
  signal: AbortSignal,
): Promise<NotificationPreferenceMap> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
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

async function patchPreference(endpoint: string, body: PreferencePatchInput): Promise<void> {
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
  const queryClient = useQueryClient();
  const preferencesKey = useMemo(
    () => queryKeys.notifications.preferencesEndpoint(endpoint),
    [endpoint],
  );
  const preferencesQuery = useQuery({
    queryKey: preferencesKey,
    queryFn: ({ signal }) => fetchPreferences(endpoint, signal),
  });
  const { mutateAsync: savePreference } = useMutation({
    mutationFn: (body: PreferencePatchInput) => patchPreference(endpoint, body),
  });

  const [draftPreferences, setDraftPreferences] = useState<NotificationPreferenceMap | null>(null);
  const [busyCells, setBusyCells] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    if (preferencesQuery.data) {
      setDraftPreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const preferences = draftPreferences ?? preferencesQuery.data ?? {};
  const loading = preferencesQuery.isPending;
  const loadError = preferencesQuery.isError ? t("settings.notifications.status.error") : null;

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

      setDraftPreferences(optimistic);
      setBusyCells((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
      setStatus("saving");

      try {
        await savePreference({ eventType, channel, enabled });
        queryClient.setQueryData(preferencesKey, optimistic);
        setStatus("saved");
      } catch {
        // Revert
        setDraftPreferences(previous);
        setStatus("error");
      } finally {
        setBusyCells((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [preferences, preferencesKey, queryClient, savePreference],
  );

  const handleResetAll = useCallback(() => {
    setDraftPreferences(resetAllPreferences());
    setStatus("idle");
  }, []);

  if (loading) {
    return (
      <div
        data-testid="notification-preferences-loading"
        className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-background p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-background p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("settings.notifications.title")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("settings.notifications.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span aria-live="polite" className="text-xs text-muted-foreground" data-status={status}>
            {status === "saving" ? t("settings.notifications.status.saving") : null}
            {status === "saved" ? t("settings.notifications.status.saved") : null}
            {status === "error" ? t("settings.notifications.status.error") : null}
          </span>
          <button
            type="button"
            onClick={handleResetAll}
            className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {t("settings.notifications.actions.resetAll")}
          </button>
        </div>
      </header>

      {loadError ? (
        <div
          className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-[hsl(var(--destructive-strong))]"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}

      {/* Header row — channel labels (desktop only) */}
      <div
        className="hidden gap-3 px-4 md:grid md:grid-cols-[2fr_repeat(var(--channel-count),minmax(0,1fr))]"
        style={{ ["--channel-count" as string]: visibleChannelIds.length }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {/* spacer for event-type column */}
        </span>
        {visibleChannelIds.map((channelId) => (
          <span
            key={channelId}
            className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
