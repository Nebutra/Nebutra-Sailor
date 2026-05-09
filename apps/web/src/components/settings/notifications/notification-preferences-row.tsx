"use client";

import type { NotificationChannel } from "@nebutra/notifications";
import type { NotificationEventTypeId } from "@/lib/notification-preferences";

export interface NotificationPreferencesRowCell {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationPreferencesRowProps {
  eventTypeId: NotificationEventTypeId;
  label: string;
  description: string;
  cells: NotificationPreferencesRowCell[];
  visibleChannelIds: NotificationChannel[];
  channelLabels: Record<NotificationChannel, string>;
  busyCells: Set<string>;
  onToggle: (
    eventTypeId: NotificationEventTypeId,
    channel: NotificationChannel,
    enabled: boolean,
  ) => void;
}

function cellClasses(enabled: boolean, busy: boolean): string {
  if (busy) {
    return "border-[var(--neutral-7)] bg-[var(--neutral-2)] text-[var(--neutral-9)] cursor-progress";
  }
  if (enabled) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  }
  return "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]";
}

export function NotificationPreferencesRow({
  eventTypeId,
  label,
  description,
  cells,
  visibleChannelIds,
  channelLabels,
  busyCells,
  onToggle,
}: NotificationPreferencesRowProps) {
  const cellByChannel = new Map(cells.map((cell) => [cell.channel, cell]));

  return (
    <div
      data-testid={`notification-row-${eventTypeId}`}
      className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-4 md:grid-cols-[2fr_repeat(var(--channel-count),minmax(0,1fr))] md:items-center"
      style={{ ["--channel-count" as string]: visibleChannelIds.length }}
    >
      <div className="md:pr-4">
        <p className="text-sm font-medium text-[var(--neutral-12)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--neutral-11)]">{description}</p>
      </div>

      {visibleChannelIds.map((channelId) => {
        const cell = cellByChannel.get(channelId);
        if (!cell) {
          return (
            <div
              key={channelId}
              className="text-xs text-[var(--neutral-9)] md:text-center"
              aria-hidden="true"
            >
              —
            </div>
          );
        }

        const busyKey = `${eventTypeId}:${channelId}`;
        const busy = busyCells.has(busyKey);
        const enabled = cell.enabled;
        const channelLabel = channelLabels[channelId] ?? channelId;

        return (
          <div key={channelId} className="flex items-center md:justify-center">
            <span className="text-xs font-medium text-[var(--neutral-11)] md:hidden">
              {channelLabel}
            </span>
            <button
              // biome-ignore lint/a11y/useSemanticElements: switch role used as toggle, semantic <input type=checkbox> would change visual treatment
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${label} — ${channelLabel}`}
              data-testid={`notification-cell-${eventTypeId}-${channelId}`}
              disabled={busy}
              onClick={() => onToggle(eventTypeId, channelId, !enabled)}
              className={`ml-auto inline-flex h-6 w-11 items-center rounded-full border px-1 transition-colors md:ml-0 ${cellClasses(
                enabled,
                busy,
              )}`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
