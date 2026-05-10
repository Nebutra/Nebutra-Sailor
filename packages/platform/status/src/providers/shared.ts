/**
 * Shared utilities used by all providers
 */

import type { StatusPageData, StatusState } from "../types";

export function calculateOverallStatus(
  monitors: { status: StatusState }[],
  incidents: { impact: string }[],
): StatusState {
  // Active incidents take precedence over monitor health
  if (incidents.some((i) => i.impact === "critical")) return "major_outage";
  if (incidents.some((i) => i.impact === "major")) return "partial_outage";
  if (incidents.some((i) => i.impact === "minor")) return "degraded";

  const statuses = monitors.map((m) => m.status);
  if (statuses.some((s) => s === "major_outage")) return "major_outage";
  if (statuses.some((s) => s === "partial_outage")) return "partial_outage";
  if (statuses.some((s) => s === "degraded")) return "degraded";
  if (statuses.some((s) => s === "maintenance")) return "maintenance";
  if (statuses.length > 0 && statuses.every((s) => s === "operational")) {
    return "operational";
  }

  return "unknown";
}

export function getDefaultStatusData(): StatusPageData {
  return {
    status: "unknown",
    monitors: [],
    activeIncidents: [],
    scheduledMaintenances: [],
    uptime: { last24h: 0, last7d: 0, last30d: 0 },
    lastUpdated: new Date().toISOString(),
  };
}
