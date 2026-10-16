"use client";

import { Metric, MetricStrip } from "@nebutra/ui/layout";

const TREND = [12, 18, 15, 22, 28, 24, 31, 35, 33, 41, 46, 52];

export function MetricStripDemo() {
  return (
    <div className="w-full p-6">
      <MetricStrip>
        <Metric label="Credit balance" value="12,480" unit="credits" trend={TREND} />
        <Metric label="API calls" value="48,210" delta={{ value: "+12.4%", tone: "positive" }} />
        <Metric label="p95 latency" value="412" unit="ms" footnote="Last 24 hours" />
      </MetricStrip>
    </div>
  );
}
