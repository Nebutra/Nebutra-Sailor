/**
 * OpenStatus Provider
 *
 * API docs: https://api.openstatus.dev/v1
 * Status page format: https://<slug>.openstatus.dev
 */

import type { StatusProvider } from "../provider";
import type {
  IncidentStatus,
  MonitorStatus,
  OpenStatusConfig,
  StatusPageData,
  StatusState,
} from "../types";
import { calculateOverallStatus, getDefaultStatusData } from "./shared";

const DEFAULT_API_URL = "https://api.openstatus.dev/v1";

export class OpenStatusProvider implements StatusProvider {
  private readonly config: OpenStatusConfig;

  constructor(config: OpenStatusConfig) {
    this.config = config;
  }

  async fetchSummary(): Promise<StatusPageData> {
    const apiUrl = this.config.apiUrl ?? DEFAULT_API_URL;
    const url = `${apiUrl}/status-page/${this.config.pageSlug}/summary`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        // Next.js ISR: revalidate every 60 s
        next: { revalidate: 60 },
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`OpenStatus API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transform(data);
    } catch {
      return getDefaultStatusData();
    }
  }

  private transform(data: Record<string, unknown>): StatusPageData {
    const rawMonitors = Array.isArray(data.monitors) ? data.monitors : [];
    const rawIncidents = Array.isArray(data.incidents) ? data.incidents : [];

    const monitors: MonitorStatus[] = rawMonitors.map((m: Record<string, unknown>) => ({
      id: String(m.id),
      name: String(m.name),
      status: mapOpenStatusState(String(m.status ?? "")),
      ...(typeof m.latency === "number" ? { latency: m.latency } : {}),
      ...(typeof m.uptime === "number" ? { uptime: m.uptime } : {}),
      ...(typeof m.lastCheck === "string" ? { lastChecked: m.lastCheck } : {}),
    }));

    const activeIncidents: IncidentStatus[] = rawIncidents
      .filter((i: Record<string, unknown>) => i.status !== "resolved")
      .map((i: Record<string, unknown>) => ({
        id: String(i.id),
        title: String(i.title),
        status: i.status as IncidentStatus["status"],
        impact: i.impact as IncidentStatus["impact"],
        createdAt: String(i.createdAt ?? ""),
        updatedAt: String(i.updatedAt ?? ""),
        ...(typeof i.resolvedAt === "string" ? { resolvedAt: i.resolvedAt } : {}),
      }));

    const uptime =
      typeof data.uptime === "object" && data.uptime !== null
        ? (data.uptime as Record<string, number>)
        : {};

    return {
      status: calculateOverallStatus(monitors, activeIncidents),
      monitors,
      activeIncidents,
      scheduledMaintenances: [],
      uptime: {
        last24h: uptime.day ?? 100,
        last7d: uptime.week ?? 100,
        last30d: uptime.month ?? 100,
      },
      lastUpdated: new Date().toISOString(),
      pageUrl: `https://${this.config.pageSlug}.openstatus.dev`,
    };
  }
}

function mapOpenStatusState(status: string): StatusState {
  switch (status.toLowerCase()) {
    case "up":
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "down":
    case "outage":
      return "major_outage";
    default:
      return "unknown";
  }
}
