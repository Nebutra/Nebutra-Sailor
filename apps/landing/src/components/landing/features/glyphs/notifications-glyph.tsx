"use client";

import { Bell, Check, Clock, Lightning, User } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/* -------------------------------------------------------------------------- *\
 *  NotificationsGlyph — mini inbox feed for @nebutra/notifications.
 *
 *  Composition: header (Bell + mono caption + live StatusDot) + 3 stacked
 *  notification rows with a compact event badge. Each row
 *  pairs an event-type chip with a short title and a relative time stamp so
 *  the multi-channel inbox affordance reads at a glance.
\* -------------------------------------------------------------------------- */

type FeedRowBase = {
  badgeStatus: "info" | "success" | "warning";
  eventType: string;
  icon: typeof Bell;
  time: string;
};

const FEED_ROWS_BASE: readonly FeedRowBase[] = [
  { badgeStatus: "success", eventType: "invoice.paid", icon: Check, time: "2m ago" },
  { badgeStatus: "info", eventType: "user.joined", icon: User, time: "18m ago" },
  { badgeStatus: "warning", eventType: "alert.triggered", icon: Lightning, time: "1h ago" },
];

type NotificationsCopy = { rows: Record<string, { title: string }> };

export function NotificationsGlyph({ copy }: SubpackageGlyphProps) {
  const t = copy as NotificationsCopy;
  const FEED_ROWS = FEED_ROWS_BASE.map((row, i) => ({ ...row, title: t.rows[String(i)].title }));

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ minHeight: 160 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-foreground">
          <Bell aria-hidden="true" className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Inbox · 3 new
          </span>
        </span>
        <StatusDot decorative label state="READY" titlePrefix="Notifications stream" />
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {FEED_ROWS.map((row) => (
          <li
            key={row.eventType}
            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"
          >
            <div className="min-w-0">
              <Badge variant="outline" className="gap-1 whitespace-nowrap font-mono text-[10px]">
                <row.icon
                  aria-hidden="true"
                  className={`size-3 shrink-0 ${
                    row.badgeStatus === "success"
                      ? "text-success-strong"
                      : row.badgeStatus === "warning"
                        ? "text-warning-strong"
                        : "text-info"
                  }`}
                />
                {row.eventType}
              </Badge>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{row.title}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Clock aria-hidden="true" className="size-3" />
              {row.time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
