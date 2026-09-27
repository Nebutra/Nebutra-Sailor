"use client";

import { MetricCard, MetricGrid } from "@nebutra/ui/primitives";

export function MetricCardDemo() {
  return (
    <div className="w-full p-6">
      <MetricGrid columns={3}>
        <MetricCard
          label="Requests"
          value="2.4M"
          trend="up"
          trendValue="+8.2%"
          description="Last 30 days"
        />
        <MetricCard
          label="Error rate"
          value="0.31%"
          trend="down"
          trendValue="-0.12%"
          description="Last 30 days"
        />
        <MetricCard
          label="p95 latency"
          value="182 ms"
          trend="neutral"
          trendValue="±0"
          description="Last 30 days"
        />
      </MetricGrid>
    </div>
  );
}
