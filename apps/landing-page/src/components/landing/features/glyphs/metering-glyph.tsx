"use client";

import { ChartActivity, Database, Lightning } from "@nebutra/icons";
import { Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    tenant: "tenant_abc123 · Pro plan",
    footer: "ClickHouse · realtime · ≤ 800ms",
  },
  zh: {
    tenant: "tenant_abc123 · Pro 套餐",
    footer: "ClickHouse · 实时 · ≤ 800ms",
  },
} as const;

type Row = {
  name: string;
  used: number;
  cap: number;
  variant: "default" | "warning" | "destructive";
  Icon: typeof ChartActivity;
};

const ROWS: readonly Row[] = [
  { name: "api_calls", used: 4521, cap: 10000, variant: "default", Icon: ChartActivity },
  { name: "ai_tokens", used: 780000, cap: 1000000, variant: "warning", Icon: Lightning },
  { name: "storage", used: 92, cap: 100, variant: "destructive", Icon: Database },
] as const;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function MeteringGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Top: tenant + plan */}
        <div className="flex items-center justify-between">
          <span className="truncate font-mono text-[10px] uppercase tracking-wide text-[var(--neutral-10)]">
            {copy.tenant}
          </span>
          <ChartActivity className="h-3 w-3 text-[var(--neutral-10)]" />
        </div>

        {/* Usage rows */}
        <div className="flex flex-col gap-1">
          {ROWS.map((row) => {
            const RowIcon = row.Icon;
            return (
              <div key={row.name} className="flex items-center gap-2">
                <RowIcon className="h-3 w-3 shrink-0 text-[var(--neutral-10)]" />
                <span className="w-[60px] shrink-0 truncate font-mono text-[9px] text-[var(--neutral-11)]">
                  {row.name}
                </span>
                <div className="flex-1">
                  <Progress
                    value={row.used}
                    max={row.cap}
                    variant={row.variant}
                    size="sm"
                    animated={false}
                  />
                </div>
                <span className="shrink-0 text-right font-mono text-[9px] tabular-nums text-[var(--neutral-11)]">
                  {fmt(row.used)} / {fmt(row.cap)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-0.5 flex items-center justify-between">
          <span className="font-mono text-[9px] text-[var(--neutral-10)]">{copy.footer}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
