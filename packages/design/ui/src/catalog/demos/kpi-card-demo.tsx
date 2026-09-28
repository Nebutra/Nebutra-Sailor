"use client";

import { ChartTrendingUp, Users } from "@nebutra/icons";
import { KpiCard } from "@nebutra/ui/primitives";

export function KpiCardDemo() {
  return (
    <div className="grid w-full gap-4 p-6 sm:grid-cols-2">
      <KpiCard
        title="Monthly recurring revenue"
        value="$48,210"
        icon={<ChartTrendingUp className="size-4" />}
        trend={{ value: 12.4, isPositive: true }}
        description="vs. last month"
      />
      <KpiCard
        title="Active seats"
        value={1284}
        icon={<Users className="size-4" />}
        trend={{ value: 2.1, isPositive: false }}
        description="vs. last month"
      />
    </div>
  );
}
