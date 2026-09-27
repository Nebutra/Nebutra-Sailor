"use client";

import { DashboardMetricTile, DashboardPanel } from "@nebutra/ui/patterns";

export function DashboardSurfacesDemo() {
  return (
    <div className="w-full p-6">
      <DashboardPanel title="This week" description="Across all projects in Acme Inc.">
        <div className="grid gap-3 sm:grid-cols-3">
          <DashboardMetricTile label="Deployments" value="148" detail="+12 vs last week" />
          <DashboardMetricTile label="Build minutes" value="3,904" detail="62% of plan" />
          <DashboardMetricTile label="Failed checks" value="7" detail="down from 19" />
        </div>
      </DashboardPanel>
    </div>
  );
}
