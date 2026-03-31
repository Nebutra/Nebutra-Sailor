/**
 * Internal Health Endpoint Provider
 *
 * Reads from the project's own /health endpoint (e.g. api-gateway).
 * Used as a fallback when no third-party status service is configured.
 *
 * Expected response shape:
 *   { status: "healthy"|"unhealthy", checks: { db: { status: "pass"|"fail", latency_ms: 12 }, ... }, timestamp: "..." }
 */

import type { StatusProvider } from "../provider";
import type { InternalStatusConfig, StatusPageData, StatusState } from "../types";
import { getDefaultStatusData } from "./shared";

export class InternalStatusProvider implements StatusProvider {
  private readonly config: InternalStatusConfig;

  constructor(config: InternalStatusConfig) {
    this.config = config;
  }

  async fetchSummary(): Promise<StatusPageData> {
    try {
      const response = await fetch(this.config.healthUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return { ...getDefaultStatusData(), status: "major_outage" };
      }

      const data = await response.json();
      const checks =
        typeof data.checks === "object" && data.checks !== null
          ? (data.checks as Record<string, Record<string, unknown>>)
          : {};

      const monitors = Object.entries(checks).map(([name, check]) => ({
        id: name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        status: (check.status === "pass" ? "operational" : "degraded") as StatusState,
        ...(typeof check.latency_ms === "number" ? { latency: check.latency_ms } : {}),
        lastChecked: new Date().toISOString(),
      }));

      return {
        status: data.status === "healthy" ? "operational" : "degraded",
        monitors,
        activeIncidents: [],
        scheduledMaintenances: [],
        uptime: { last24h: 100, last7d: 100, last30d: 100 },
        lastUpdated: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
      };
    } catch {
      return { ...getDefaultStatusData(), status: "unknown" };
    }
  }
}
