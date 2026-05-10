/**
 * Atlassian Statuspage Provider
 *
 * API docs: https://developer.statuspage.io/#operation/getPagesPageIdSummary
 * Public summary endpoint (no auth required for public pages):
 *   GET https://<pageId>.statuspage.io/api/v2/summary.json
 *   GET https://<customDomain>/api/v2/summary.json
 *
 * Indicator mapping:
 *   none     → operational
 *   minor    → degraded
 *   major    → partial_outage
 *   critical → major_outage
 *
 * Component status mapping:
 *   operational          → operational
 *   degraded_performance → degraded
 *   partial_outage       → partial_outage
 *   major_outage         → major_outage
 *   under_maintenance    → maintenance
 */

import type { StatusProvider } from "../provider";
import type {
  IncidentStatus,
  MonitorStatus,
  ScheduledMaintenance,
  StatusPageData,
  StatuspageConfig,
  StatusState,
} from "../types";
import { calculateOverallStatus, getDefaultStatusData } from "./shared";

export class AtlassianStatuspageProvider implements StatusProvider {
  private readonly config: StatuspageConfig;

  constructor(config: StatuspageConfig) {
    this.config = config;
  }

  async fetchSummary(): Promise<StatusPageData> {
    const baseUrl = this.resolveBaseUrl();
    const url = `${baseUrl}/api/v2/summary.json`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`Statuspage API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transform(data);
    } catch {
      return getDefaultStatusData();
    }
  }

  /**
   * Resolve the base URL from config.
   * If pageId looks like a URL (starts with http), use it directly.
   * Otherwise treat it as a Statuspage subdomain.
   */
  private resolveBaseUrl(): string {
    if (this.config.apiUrl) return this.config.apiUrl.replace(/\/$/, "");
    if (this.config.pageId.startsWith("http")) {
      return this.config.pageId.replace(/\/$/, "");
    }
    return `https://${this.config.pageId}.statuspage.io`;
  }

  private transform(data: Record<string, unknown>): StatusPageData {
    const rawComponents = Array.isArray(data.components) ? data.components : [];
    const rawIncidents = Array.isArray(data.incidents) ? data.incidents : [];
    const rawMaintenances = Array.isArray(data.scheduled_maintenances)
      ? data.scheduled_maintenances
      : [];

    const page =
      typeof data.page === "object" && data.page !== null
        ? (data.page as Record<string, unknown>)
        : {};

    // Components → monitors (skip group containers)
    const monitors: MonitorStatus[] = rawComponents
      .filter((c: Record<string, unknown>) => !c.group)
      .map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name),
        status: mapComponentStatus(String(c.status ?? "")),
        ...(typeof c.description === "string" ? { description: c.description } : {}),
        ...(typeof c.updated_at === "string" ? { lastChecked: c.updated_at } : {}),
      }));

    // Active incidents (not resolved / not postmortem)
    const activeIncidents: IncidentStatus[] = rawIncidents
      .filter((i: Record<string, unknown>) => i.status !== "resolved" && i.status !== "postmortem")
      .map((i: Record<string, unknown>) => ({
        id: String(i.id),
        title: String(i.name ?? i.title ?? ""),
        status: mapIncidentStatus(String(i.status ?? "")),
        impact: mapImpact(String(i.impact ?? "none")),
        createdAt: String(i.created_at ?? ""),
        updatedAt: String(i.updated_at ?? ""),
        ...(typeof i.resolved_at === "string" ? { resolvedAt: i.resolved_at } : {}),
        ...(typeof i.shortlink === "string" ? { shortlink: i.shortlink } : {}),
      }));

    // Scheduled maintenances
    const scheduledMaintenances: ScheduledMaintenance[] = rawMaintenances.map(
      (m: Record<string, unknown>) => ({
        id: String(m.id),
        title: String(m.name ?? m.title ?? ""),
        status: mapMaintenanceStatus(String(m.status ?? "")),
        scheduledFor: String(m.scheduled_for ?? ""),
        scheduledUntil: String(m.scheduled_until ?? ""),
      }),
    );

    // Overall status: prefer the top-level indicator over deriving from components
    const rawStatus =
      typeof data.status === "object" && data.status !== null
        ? (data.status as Record<string, unknown>)
        : {};
    const overallStatus =
      mapIndicatorStatus(String(rawStatus.indicator ?? "")) ??
      calculateOverallStatus(monitors, activeIncidents);

    return {
      status: overallStatus,
      monitors,
      activeIncidents,
      scheduledMaintenances,
      uptime: {
        // Statuspage v2 summary does not include uptime percentages.
        // These can be fetched from a separate endpoint if needed.
        last24h: 100,
        last7d: 100,
        last30d: 100,
      },
      lastUpdated: typeof page.updated_at === "string" ? page.updated_at : new Date().toISOString(),
      ...(typeof page.url === "string" ? { pageUrl: page.url } : {}),
    };
  }
}

// ============================================
// Mapping helpers
// ============================================

function mapIndicatorStatus(indicator: string): StatusState {
  switch (indicator.toLowerCase()) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
      return "partial_outage";
    case "critical":
      return "major_outage";
    case "maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

function mapComponentStatus(status: string): StatusState {
  switch (status.toLowerCase()) {
    case "operational":
      return "operational";
    case "degraded_performance":
      return "degraded";
    case "partial_outage":
      return "partial_outage";
    case "major_outage":
      return "major_outage";
    case "under_maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

function mapIncidentStatus(status: string): IncidentStatus["status"] {
  switch (status.toLowerCase()) {
    case "investigating":
      return "investigating";
    case "identified":
      return "identified";
    case "monitoring":
      return "monitoring";
    case "postmortem":
      return "postmortem";
    default:
      return "resolved";
  }
}

function mapImpact(impact: string): IncidentStatus["impact"] {
  switch (impact.toLowerCase()) {
    case "minor":
      return "minor";
    case "major":
      return "major";
    case "critical":
      return "critical";
    default:
      return "none";
  }
}

function mapMaintenanceStatus(status: string): ScheduledMaintenance["status"] {
  switch (status.toLowerCase()) {
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "scheduled";
  }
}
