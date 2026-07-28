"use client";

import { ChartActivity, ChartTrendingUp, Clock, Users } from "@nebutra/icons";
import { Badge, MetricCard } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    activeUsers: "Active users",
    sessions: "Sessions",
    avgDuration: "Avg duration",
    footer: "event.tracked · last 7 days",
  },
  zh: {
    activeUsers: "活跃用户",
    sessions: "会话数",
    avgDuration: "平均时长",
    footer: "event.tracked · 近 7 天",
  },
} as const;

// 14 bars — varying heights as a percentage of column height
const BARS = [42, 58, 35, 71, 49, 63, 38, 82, 55, 68, 47, 76, 60, 88] as const;

export function AnalyticsGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* KPI tiles row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5">
            <MetricCard size="sm" label={copy.activeUsers} value="1,247" icon={<Users />} />
            <Badge variant="green-subtle" size="sm" className="w-fit gap-0.5">
              <ChartTrendingUp className="h-2.5 w-2.5" />
              <span className="text-[9px]">+12%</span>
            </Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <MetricCard size="sm" label={copy.sessions} value="4,521" icon={<ChartActivity />} />
            <Badge variant="green-subtle" size="sm" className="w-fit gap-0.5">
              <ChartTrendingUp className="h-2.5 w-2.5" />
              <span className="text-[9px]">+8%</span>
            </Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <MetricCard size="sm" label={copy.avgDuration} value="8m 32s" icon={<Clock />} />
            <Badge variant="green-subtle" size="sm" className="w-fit gap-0.5">
              <ChartTrendingUp className="h-2.5 w-2.5" />
              <span className="text-[9px]">+4%</span>
            </Badge>
          </div>
        </div>

        {/* 14-bar weekly column chart */}
        <div className="flex h-9 items-end gap-[3px]">
          {BARS.map((h, i) => (
            <div
              key={`bar-${i}`}
              className="flex-1 rounded-[var(--radius-sm)] bg-[hsl(var(--primary))]"
              style={{ height: `${h}%`, opacity: 0.55 + (h / 100) * 0.45 }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">{copy.footer}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-green-900" />
        </div>
      </div>
    </div>
  );
}
