"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

function formatUSD(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * 30-day revenue bar chart with gradient-highlighted latest bar.
 */
export function RevenueBarChart({ series }: Props) {
  const t = useTranslations("startupOs");
  if (series.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {t("emptyState.revenueChart")}
      </div>
    );
  }

  const data = series.map((row) => ({
    day: formatDay(row.day),
    Revenue: row.revenue,
  }));

  const maxIdx = data.length - 1;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatUSD}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          formatter={(value: number) => [formatUSD(value), "Revenue"]}
        />
        <Bar dataKey="Revenue" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === maxIdx ? "hsl(var(--primary))" : "hsl(var(--border))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
