"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthSummary } from "@/lib/warehouse/gold";

interface Props {
  series: GrowthSummary[];
}

function formatDay(day: string | null) {
  if (!day) return "";
  const d = new Date(day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

/**
 * 30-day funnel area chart: signups → activations → conversions.
 * Rendered client-side; data fetched server-side and passed as prop.
 */
export function GrowthAreaChart({ series }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--neutral-11)]">
        No trend data available yet.
      </div>
    );
  }

  const data = series.map((row) => ({
    day: formatDay(row.day),
    Signups: row.signups,
    Activations: row.activations,
    Conversions: row.conversions,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradActivations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--brand-accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradConversions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-tertiary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--brand-tertiary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-6)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "var(--neutral-11)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--neutral-11)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatNumber}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "var(--neutral-1)",
            border: "1px solid var(--neutral-7)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--neutral-12)", fontWeight: 600 }}
          formatter={(value: number) => [formatNumber(value), ""]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--neutral-11)" }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="Signups"
          stroke="var(--brand-primary)"
          strokeWidth={2}
          fill="url(#gradSignups)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="Activations"
          stroke="var(--brand-accent)"
          strokeWidth={2}
          fill="url(#gradActivations)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="Conversions"
          stroke="var(--brand-tertiary)"
          strokeWidth={2}
          fill="url(#gradConversions)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
