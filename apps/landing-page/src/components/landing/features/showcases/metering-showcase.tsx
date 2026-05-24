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
import type { PackageShowcaseProps } from "./types";

type Bilingual = { en: string; zh: string };
type ProgressTone = "warning" | "success" | undefined;
type TierVariant = "blue-subtle" | "purple-subtle" | "teal-subtle" | "gray-subtle";

type Kpi = {
  cap: number;
  format: "compact" | "raw";
  icon: typeof BarChart;
  id: string;
  label: Bilingual;
  unit?: Bilingual;
  used: number;
};

type MeterRow = { cap: number; meter: string; tier: Bilingual; tone: TierVariant; used: number };

const KPIS: Kpi[] = [
  {
    cap: 10_000,
    format: "raw",
    icon: BarChart,
    id: "api_calls",
    label: { en: "API calls", zh: "API 调用" },
    used: 4521,
  },
  {
    cap: 2_000_000,
    format: "compact",
    icon: Lightning,
    id: "ai_tokens",
    label: { en: "AI tokens", zh: "AI tokens" },
    used: 847_000,
  },
  {
    cap: 50,
    format: "raw",
    icon: Database,
    id: "storage",
    label: { en: "Storage", zh: "存储" },
    unit: { en: "GB", zh: "GB" },
    used: 12,
  },
  {
    cap: 100,
    format: "raw",
    icon: Users,
    id: "active_users",
    label: { en: "Active users", zh: "活跃用户" },
    used: 38,
  },
];

const METER_ROWS: MeterRow[] = [
  {
    cap: 10_000,
    meter: "api_calls",
    tier: { en: "Pro · $0.001/call", zh: "Pro · $0.001/次" },
    tone: "blue-subtle",
    used: 4521,
  },
  {
    cap: 2_000_000,
    meter: "ai_tokens",
    tier: { en: "Pro · metered", zh: "Pro · 按量" },
    tone: "purple-subtle",
    used: 847_000,
  },
  {
    cap: 50_000_000_000,
    meter: "storage_bytes",
    tier: { en: "Pro · 50 GB incl.", zh: "Pro · 含 50 GB" },
    tone: "teal-subtle",
    used: 12_000_000_000,
  },
  {
    cap: 100,
    meter: "active_seats",
    tier: { en: "Pro · seat-based", zh: "Pro · 席位" },
    tone: "gray-subtle",
    used: 38,
  },
];

const COPY = {
  en: {
    capLabel: "Cap",
    footer: "Aggregated in ClickHouse · realtime · ≤ 800ms p99",
    meterLabel: "Meter",
    of: "of",
    package: "@nebutra/metering",
    pctLabel: "% used",
    planPro: "Pro",
    realtime: "live",
    tierLabel: "Pricing tier",
    title: "Usage metering",
    usedLabel: "Period usage",
  },
  zh: {
    capLabel: "上限",
    footer: "ClickHouse 实时聚合 · ≤ 800ms p99",
    meterLabel: "计量项",
    of: "/",
    package: "@nebutra/metering",
    pctLabel: "使用率",
    planPro: "Pro",
    realtime: "实时",
    tierLabel: "计费档位",
    title: "用量计量",
    usedLabel: "本期用量",
  },
} as const;

function tone(pct: number): ProgressTone {
  if (pct >= 80) return "warning";
  if (pct >= 50) return undefined;
  return "success";
}

function formatNumber(value: number, locale: "en" | "zh", compact = false): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function pct(used: number, cap: number): number {
  return Math.round((used / cap) * 100);
}

export function MeteringShowcase({ locale }: PackageShowcaseProps) {
  const t = COPY[locale];
  const fmt = (n: number, compact = false) => formatNumber(n, locale, compact);

  return (
    <div
      className="flex w-full flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-background p-5 md:p-6"
      style={{ minHeight: "400px" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BarChart className="size-4" aria-hidden="true" />
          <span>{t.package}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="sm" variant="gray-subtle">
            <span className="font-mono">tenant_org_abc123</span>
          </Badge>
          <Badge size="sm" variant="blue-subtle">
            {t.planPro}
          </Badge>
          <Badge size="sm" variant="green-subtle">
            <Clock aria-hidden="true" />
            {t.realtime}
          </Badge>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t.title}>
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          const usedPct = pct(kpi.used, kpi.cap);
          const compact = kpi.format === "compact";
          const unit = kpi.unit ? ` ${kpi.unit[locale]}` : "";
          return (
            <li key={kpi.id} className="rounded-md border border-border bg-card p-3">
              <MetricCard
                size="sm"
                icon={<Icon aria-hidden="true" />}
                label={kpi.label[locale]}
                value={`${fmt(kpi.used, compact)}${unit}`}
                description={`${t.of} ${fmt(kpi.cap, compact)}${unit}`}
              />
              <div className="mt-3">
                <Progress
                  value={usedPct}
                  max={100}
                  type={tone(usedPct)}
                  size="sm"
                  aria-label={`${kpi.label[locale]} ${usedPct}%`}
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
          {METER_ROWS.map((row) => {
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
                    {row.tier[locale]}
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
    </div>
  );
}
