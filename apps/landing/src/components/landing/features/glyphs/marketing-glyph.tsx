"use client";

import { ChartTrendingUp, Notification, Sparkles, Users } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// The audience/sequence line is an identifier — same on every locale.
const FOOTER = "audience: pro-tier · sequence_4";

type MarketingCopy = {
  campaign: string;
  status: string;
  sent: string;
  opens: string;
  clicks: string;
};

/**
 * MarketingGlyph
 *
 * Mini campaign-card preview for @nebutra/marketing. Header pairs the
 * campaign name with a live-status Badge, followed by a 3-cell stat
 * strip (sent / opens / clicks), a determinate progress bar at 68%,
 * and a mono footer revealing the audience + sequence step.
 */
export function MarketingGlyph({ copy: rawCopy }: SubpackageGlyphProps) {
  const copy = rawCopy as MarketingCopy;

  return (
    <div
      aria-hidden="true"
      className="flex w-full flex-col justify-between gap-2.5 rounded-[var(--radius-lg)] bg-muted px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Header row: icon + campaign name + status badge */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
          <Notification className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate text-[12px] font-semibold text-foreground">
            {copy.campaign}
          </span>
          <Badge variant="green-subtle" size="sm" className="shrink-0" icon={<Sparkles />}>
            {copy.status}
          </Badge>
        </div>
      </div>

      {/* 3-cell stat strip */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-background px-2 py-1.5 ring-1 ring-border">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {copy.sent}
          </span>
          <span className="font-mono text-[12px] font-semibold text-foreground">12,400</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-background px-2 py-1.5 ring-1 ring-border">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            <Users className="h-2.5 w-2.5" />
            {copy.opens}
          </span>
          <span className="font-mono text-[12px] font-semibold text-foreground">47%</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-background px-2 py-1.5 ring-1 ring-border">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            <ChartTrendingUp className="h-2.5 w-2.5" />
            {copy.clicks}
          </span>
          <span className="font-mono text-[12px] font-semibold text-foreground">12%</span>
        </div>
      </div>

      {/* Progress + mono footer */}
      <div className="space-y-1">
        <Progress value={68} max={100} size="sm" animated={false} />
        <p className="truncate font-mono text-[10px] text-muted-foreground">{FOOTER}</p>
      </div>
    </div>
  );
}
