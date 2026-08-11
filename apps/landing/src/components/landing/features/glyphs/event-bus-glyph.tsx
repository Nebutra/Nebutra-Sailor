"use client";

import { Connection, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * EventBusGlyph
 *
 * Mini event-topic dashboard. Left column lists four pub-sub topics with
 * subscriber counts; right column shows three pulse indicators hinting at
 * active flow — one live (emerald), two idle (muted).
 */

type Topic = {
  name: string;
  subs: number;
};

const TOPICS: ReadonlyArray<Topic> = [
  { name: "billing.invoice.paid", subs: 12 },
  { name: "auth.user.signin", subs: 8 },
  { name: "inventory.item.updated", subs: 4 },
  { name: "system.error", subs: 2 },
];

type Pulse = {
  Icon: typeof Lightning | typeof Connection;
  tone: "live" | "idle";
  label: string;
};

const PULSES: ReadonlyArray<Pulse> = [
  { Icon: Lightning, tone: "live", label: "Active topic" },
  { Icon: Connection, tone: "idle", label: "Idle topic" },
  { Icon: Lightning, tone: "idle", label: "Idle topic" },
];

export function EventBusGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full items-stretch gap-3 rounded-[var(--radius-lg)] bg-muted px-3 py-3"
      style={{ height: 160 }}
    >
      {/* Topic list */}
      <ul className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        {TOPICS.map((topic) => (
          <li
            key={topic.name}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-background px-2 py-1.5"
          >
            <Badge
              variant="outline"
              size="sm"
              className="min-w-0 max-w-full truncate font-mono text-[10px]"
            >
              <span className="truncate">{topic.name}</span>
            </Badge>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {topic.subs} subs
            </span>
          </li>
        ))}
      </ul>

      {/* Pulse rail */}
      <div
        aria-hidden="true"
        className="flex w-7 shrink-0 flex-col items-center justify-between rounded-[var(--radius-md)] bg-background py-2"
      >
        {PULSES.map((pulse, i) => {
          const Icon = pulse.Icon;
          const isLive = pulse.tone === "live";
          return (
            <span
              key={i}
              className={
                isLive
                  ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-success motion-safe:animate-pulse"
                  : "flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground"
              }
              title={pulse.label}
            >
              <Icon className="h-3 w-3" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
