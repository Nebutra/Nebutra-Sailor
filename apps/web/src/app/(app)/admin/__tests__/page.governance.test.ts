import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The dashboard Home converged into Startup OS (merge); its real growth metrics
// were rehomed here. The admin KPI block used to render hardcoded "TBD" values
// with a ChartPlaceholder ("wire from @nebutra/billing / @nebutra/metering").
// This is the de-mock: admin now renders the getGrowthSummary-backed
// WorkspaceMetrics block (honest zero values when the warehouse has no data).
const ADMIN_PAGE = join(process.cwd(), "src/app/(app)/admin/page.tsx");

describe("@nebutra/web admin metrics de-mock", () => {
  const source = readFileSync(ADMIN_PAGE, "utf8");

  it("renders real warehouse-backed metrics instead of TBD placeholders", () => {
    expect(source).toContain("getGrowthSummary");
    expect(source).toContain("DashboardMetricTile");
    expect(source).toContain("DashboardPanel");
    expect(source).toContain("WorkspaceMetrics");
  });

  it("drops the hardcoded TBD KPI cards and the chart placeholder", () => {
    expect(source).not.toContain("TBD");
    expect(source).not.toContain("ChartPlaceholder");
    expect(source).not.toContain("chart: wire real data");
    expect(source).not.toContain("wire from @nebutra/billing");
    expect(source).not.toContain("wire from @nebutra/metering");
  });

  it("keeps the metrics block a Suspense-streamed server surface", () => {
    expect(source).toContain('import "server-only"');
    expect(source).toContain("Suspense");
    expect(source).toContain("MetricsSkeleton");
  });
});
