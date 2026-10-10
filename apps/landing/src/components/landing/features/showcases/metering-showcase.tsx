"use client";

import { BarChart, Clock, Database, Lightning, Users } from "@nebutra/icons";
import {
  Badge,
  MetricCard,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";
import { useFormatLocale } from "./use-format-locale";

type ProgressTone = "warning" | "success" | undefined;
type TierVariant = "blue-subtle" | "purple-subtle" | "teal-subtle" | "gray-subtle";

type Kpi = {
  cap: number;
  format: "compact" | "raw";
  icon: typeof BarChart;
  id: string;
  unit?: string;
  used: number;
};

type MeterRow = { cap: number; meter: string; tone: TierVariant; used: number };

const KPIS: Kpi[] = [
  { cap: 10_000, format: "raw", icon: BarChart, id: "api_calls", used: 4521 },
  { cap: 2_000_000, format: "compact", icon: Lightning, id: "ai_tokens", used: 847_000 },
  { cap: 50, format: "raw", icon: Database, id: "storage", unit: "GB", used: 12 },
  { cap: 100, format: "raw", icon: Users, id: "active_users", used: 38 },
];

const METER_ROWS: MeterRow[] = [
  { cap: 10_000, meter: "api_calls", tone: "blue-subtle", used: 4521 },
  { cap: 2_000_000, meter: "ai_tokens", tone: "purple-subtle", used: 847_000 },
  { cap: 50_000_000_000, meter: "storage_bytes", tone: "teal-subtle", used: 12_000_000_000 },
  { cap: 100, meter: "active_seats", tone: "gray-subtle", used: 38 },
];

type MeteringCopy = {
  kpis: Record<string, { label: string }>;
  meterRows: Record<string, { tier: string }>;
  capLabel: string;
  footer: string;
  meterLabel: string;
  of: string;
  pctLabel: string;
  realtime: string;
  tierLabel: string;
  title: string;
  usedLabel: string;
};

// Same on every locale — package name and plan name are not translatable copy.
const PACKAGE_NAME = "@nebutra/metering";
const PLAN_PRO = "Pro";

function tone(pct: number): ProgressTone {
  if (pct >= 80) return "warning";
  if (pct >= 50) return undefined;
  return "success";
}

function formatNumber(value: number, locale: string, compact = false): string {
  return new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function pct(used: number, cap: number): number {
  return Math.round((used / cap) * 100);
}

export function MeteringShowcase({ copy }: PackageShowcaseProps) {
  const t = copy as MeteringCopy;
  const locale = useFormatLocale();
  const fmt = (n: number, compact = false) => formatNumber(n, locale, compact);

  return (
    <ShowcaseFrame className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BarChart className="size-4" aria-hidden="true" />
          <span>{PACKAGE_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="sm" variant="gray-subtle">
            <span className="font-mono">tenant_org_abc123</span>
          </Badge>
          <Badge size="sm" variant="blue-subtle">
            {PLAN_PRO}
          </Badge>
          <Badge size="sm" variant="green-subtle">
            <Clock aria-hidden="true" />
            {t.realtime}
          </Badge>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t.title}>
        {KPIS.map((kpi, index) => {
          const Icon = kpi.icon;
          const usedPct = pct(kpi.used, kpi.cap);
          const compact = kpi.format === "compact";
          const unit = kpi.unit ? ` ${kpi.unit}` : "";
          const label = t.kpis[String(index)].label;
          return (
            <li
              key={kpi.id}
              className="rounded-[var(--radius-md)] border border-border bg-card p-3"
            >
              <MetricCard
                size="sm"
                icon={<Icon aria-hidden="true" />}
                label={label}
                value={`${fmt(kpi.used, compact)}${unit}`}
                description={`${t.of} ${fmt(kpi.cap, compact)}${unit}`}
              />
              <div className="mt-3">
                <Progress
                  value={usedPct}
                  max={100}
                  type={tone(usedPct)}
                  size="sm"
                  aria-label={`${label} ${usedPct}%`}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Table aria-label={t.title}>
        <TableHeader>
          <TableRow>
            <TableHead>{t.meterLabel}</TableHead>
            <TableHead numeric>{t.usedLabel}</TableHead>
            <TableHead numeric>{t.capLabel}</TableHead>
            <TableHead>{t.pctLabel}</TableHead>
            <TableHead>{t.tierLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody bordered>
          {METER_ROWS.map((row, index) => {
            const usedPct = pct(row.used, row.cap);
            return (
              <TableRow key={row.meter}>
                <TableCell className="font-mono text-xs">{row.meter}</TableCell>
                <TableCell numeric>{fmt(row.used)}</TableCell>
                <TableCell numeric>{fmt(row.cap)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={usedPct}
                      max={100}
                      size="sm"
                      type={tone(usedPct)}
                      className="w-20"
                      aria-label={`${row.meter} ${usedPct}%`}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">{usedPct}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge size="sm" variant={row.tone}>
                    {t.meterRows[String(index)].tier}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <footer className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Database className="size-3" aria-hidden="true" />
        <span>{t.footer}</span>
      </footer>
    </ShowcaseFrame>
  );
}
