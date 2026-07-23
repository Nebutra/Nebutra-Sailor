"use client";

import { Clock, Sparkles, Users } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    yourPosition: "your position",
    of: "of",
    joined: "joined",
    addedToday: "added today",
    rows: [
      { email: "m••@acme.com", ago: "2m ago" },
      { email: "j••@globex.io", ago: "18m ago" },
      { email: "s••@initech.com", ago: "1h ago" },
    ],
  },
  zh: {
    yourPosition: "你的位置",
    of: "/",
    joined: "加入",
    addedToday: "今日新增",
    rows: [
      { email: "m••@acme.com", ago: "2 分钟前" },
      { email: "j••@globex.io", ago: "18 分钟前" },
      { email: "s••@initech.com", ago: "1 小时前" },
    ],
  },
} as const;

const POSITION = 142;
const TOTAL = 1843;
const PERCENT = 92;
const ADDED_TODAY = 23;

export function WaitlistGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Position + progress header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <Users className="h-3 w-3 self-center text-muted-foreground" />
            <span className="text-3xl font-semibold tabular-nums leading-none text-foreground">
              #{POSITION}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{copy.yourPosition}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {POSITION} {copy.of} {TOTAL.toLocaleString()}
          </span>
          <div className="flex-1">
            <Progress
              value={PERCENT}
              size="sm"
              animated={false}
              aria-label={`position ${POSITION} of ${TOTAL}`}
            />
          </div>
        </div>

        {/* Recent joiners */}
        <div className="mt-0.5 flex flex-col gap-0.5">
          {copy.rows.map((row) => (
            <div
              key={row.email}
              className="flex items-center justify-between font-mono text-[10px] text-muted-foreground"
            >
              <span className="truncate text-foreground">{row.email}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {row.ago}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-0.5 flex items-center justify-between">
          <Badge variant="green-subtle" size="sm" icon={<Sparkles />}>
            <span className="font-mono tabular-nums">
              +{ADDED_TODAY} {copy.addedToday}
            </span>
          </Badge>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
