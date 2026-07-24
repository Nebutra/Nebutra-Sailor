"use client";

import { Bell, Check, Clock, Lightning, User } from "@nebutra/icons";
import { StatusBadge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/* -------------------------------------------------------------------------- *\
 *  NotificationsGlyph — mini inbox feed for @nebutra/notifications.
 *
 *  Composition: header (Bell + mono caption + live StatusDot) + 3 stacked
 *  notification rows using StatusBadge in distinct status variants. Each row
 *  pairs an event-type chip with a short title and a relative time stamp so
 *  the multi-channel inbox affordance reads at a glance.
\* -------------------------------------------------------------------------- */

type FeedRow = {
  badgeStatus: "info" | "success" | "warning";
  eventType: string;
  icon: typeof Bell;
  time: string;
  title: { en: string; zh: string };
};

const FEED_ROWS: readonly FeedRow[] = [
  {
    badgeStatus: "success",
    eventType: "invoice.paid",
    icon: Check,
    time: "2m ago",
    title: { en: "payment received", zh: "已收到付款" },
  },
  {
    badgeStatus: "info",
    eventType: "user.joined",
    icon: User,
    time: "18m ago",
    title: { en: "new teammate", zh: "新队友加入" },
  },
  {
    badgeStatus: "warning",
    eventType: "alert.triggered",
    icon: Lightning,
    time: "1h ago",
    title: { en: "rate limit hit", zh: "触发限流" },
  },
];

export function NotificationsGlyph({ locale }: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
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
          <li key={row.eventType} className="flex h-7 items-center justify-between gap-2">
            <StatusBadge
              className="h-7 py-0 text-[10px]"
              leftIcon={row.icon}
              leftLabel={row.eventType}
              rightLabel={row.title[locale]}
              status={row.badgeStatus}
            />
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
