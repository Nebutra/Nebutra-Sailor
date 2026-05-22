"use client";

import { ChartTrendingUp, Servers } from "@nebutra/icons";
import { KpiCard } from "@nebutra/ui/primitives";

export function KpiCardDemo() {
  return (
    <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
      <KpiCard
        title="Active tenants"
        value={1284}
        icon={<Servers className="size-5 text-muted-foreground" />}
        trend={{ value: 12, isPositive: true }}
        description="Enterprise workspaces only"
      />
      <KpiCard
        title="API calls"
        value="8.7M"
        icon={<ChartTrendingUp className="size-5 text-muted-foreground" />}
        trend={{ value: -3, isPositive: false }}
        description="Rolling seven-day window"
      />
    </div>
  );
}
