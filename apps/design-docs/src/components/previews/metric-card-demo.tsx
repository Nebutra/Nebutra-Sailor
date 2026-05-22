"use client";

import { Gauge, Servers, Warning } from "@nebutra/icons";
import { MetricCardBordered, MetricGrid } from "@nebutra/ui/primitives";

export function MetricCardDemo() {
  return (
    <MetricGrid className="w-full max-w-3xl" columns={3}>
      <MetricCardBordered
        label="Events ingested"
        value="2.4M"
        trend="up"
        trendValue="+12%"
        description="vs last week"
        icon={<Servers />}
      />
      <MetricCardBordered
        label="Error rate"
        value="0.18%"
        trend="down"
        trendValue="-0.3%"
        description="lower is better"
        icon={<Warning />}
      />
      <MetricCardBordered
        label="P95 latency"
        value="148ms"
        trend="neutral"
        trendValue="0"
        description="stable"
        icon={<Gauge />}
      />
    </MetricGrid>
  );
}
