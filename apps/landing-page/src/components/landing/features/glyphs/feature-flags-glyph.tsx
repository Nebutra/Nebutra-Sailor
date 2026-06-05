"use client";

import { Lightning, Users } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * FeatureFlagsGlyph — mini flag-layer dashboard.
 *
 * Three flag rows showing toggle state + rollout %, each with an
 * audience chip. Footer cites edge-evaluation latency. Visual hint:
 * progressive delivery / experiment-grade flag platform.
 */

const COPY = {
  en: {
    audiences: {
      pro: "Pro users",
      all: "All users",
      internal: "Internal",
    },
    footer: "evaluated at edge · 5ms p50",
  },
  zh: {
    audiences: {
      pro: "Pro 用户",
      all: "全量用户",
      internal: "内部员工",
    },
    footer: "边缘评估 · 5ms p50",
  },
} as const;

type Row = {
  name: string;
  on: boolean;
  rollout: number;
  audience: "pro" | "all" | "internal";
};

const ROWS: readonly Row[] = [
  { name: "new-checkout-v2", on: true, rollout: 12, audience: "pro" },
  { name: "dark-mode-v3", on: true, rollout: 50, audience: "all" },
  { name: "payments-redesign", on: false, rollout: 100, audience: "internal" },
] as const;

export function FeatureFlagsGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-3 shadow-sm ring-1 ring-[var(--neutral-6)]">
        {ROWS.map((row) => (
          <div key={row.name} className="flex flex-col gap-0.5">
            {/* Top row: name · toggle · rollout % */}
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-mono text-[10px] text-[var(--neutral-12)]">
                {row.name}
              </span>

              {/* Toggle pill */}
              <div
                className="relative h-3 w-6 shrink-0 rounded-full transition-colors"
                style={{
                  background: row.on ? "var(--brand-primary)" : "var(--neutral-5)",
                }}
              >
                <span
                  className="absolute top-0.5 h-2 w-2 rounded-full bg-white shadow-sm transition-[left,transform]"
                  style={{ left: row.on ? "calc(100% - 10px)" : "2px" }}
                />
              </div>

              <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--neutral-11)]">
                {row.rollout}%
              </span>
            </div>

            {/* Rollout progress bar */}
            <Progress
              value={row.rollout}
              max={100}
              size="sm"
              variant={row.on ? "default" : "default"}
              animated={false}
            />

            {/* Audience chip */}
            <div className="flex items-center">
              <Badge variant="outline" size="sm" className="h-4 gap-1 px-1.5 font-mono text-[9px]">
                <Users className="h-2 w-2" aria-hidden="true" />
                {t.audiences[row.audience]}
              </Badge>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-[var(--neutral-10)]">
          <Lightning className="h-2.5 w-2.5" aria-hidden="true" />
          <span className="truncate">{t.footer}</span>
        </div>
      </div>
    </div>
  );
}
