/**
 * Instatus Status Page Provider
 *
 * Public summary (no auth):
 *   GET https://status.example.com/summary.json
 *
 * Docs: https://instatus.com/help/api/public-data
 *
 * Page statuses: UP | HASISSUES | UNDERMAINTENANCE
 * Incident statuses: INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED
 * Impacts: NONE | MINOROUTAGE | MAJOROUTAGE | CRITICALOUTAGE (variants observed)
 */

import type { StatusProvider } from "../provider";
import type {
  IncidentStatus,
  InstatusConfig,
  MonitorStatus,
  ScheduledMaintenance,
  StatusPageData,
  StatusState,
} from "../types";
import { calculateOverallStatus, fetchWithStatusTimeout, getDefaultStatusData } from "./shared";

export class InstatusStatusProvider implements StatusProvider {
  private readonly config: InstatusConfig;

  constructor(config: InstatusConfig) {
    this.config = config;
  }

  async fetchSummary(): Promise<StatusPageData> {
    const baseUrl = this.resolveBaseUrl();
    const url = `${baseUrl}/summary.json`;

    try {
      const response = await fetchWithStatusTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        throw new Error(`Instatus API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transform(data, baseUrl);
    } catch {
      return getDefaultStatusData();
    }
  }

  private resolveBaseUrl(): string {
    if (this.config.apiUrl) return trimTrailingSlash(this.config.apiUrl);
    if (this.config.pageUrl.startsWith("http")) {
      return trimTrailingSlash(this.config.pageUrl);
    }
    return `https://${this.config.pageUrl}.instatus.com`;
  }

  private transform(data: Record<string, unknown>, baseUrl: string): StatusPageData {
    const page =
      typeof data.page === "object" && data.page !== null
        ? (data.page as Record<string, unknown>)
        : {};

    const rawIncidents = Array.isArray(data.activeIncidents) ? data.activeIncidents : [];
    const rawMaintenances = Array.isArray(data.activeMaintenances)
      ? data.activeMaintenances
      : Array.isArray(data.activeMaintenance)
        ? data.activeMaintenance
        : [];

    // Some Instatus pages expose components in extended summaries
    const rawComponents = Array.isArray(data.components)
      ? data.components
      : Array.isArray(data.services)
        ? data.services
        : [];

    const monitors: MonitorStatus[] = rawComponents.filter(isRecord).map((component, index) => ({
      id: String(component.id ?? component.slug ?? index),
      name: String(component.name ?? component.title ?? `Component ${index + 1}`),
      status: mapComponentStatus(String(component.status ?? component.state ?? page.status ?? "")),
      ...(typeof component.description === "string" ? { description: component.description } : {}),
    }));

    const activeIncidents: IncidentStatus[] = rawIncidents.filter(isRecord).map((incident, i) => {
      const started = String(incident.started ?? incident.startedAt ?? incident.createdAt ?? "");
      const url = typeof incident.url === "string" ? incident.url : undefined;
      return {
        id: String(incident.id ?? url ?? `incident-${i}`),
        title: String(incident.name ?? incident.title ?? "Incident"),
        status: mapIncidentStatus(String(incident.status ?? "")),
        impact: mapImpact(String(incident.impact ?? "")),
        createdAt: started,
        updatedAt: String(incident.updated ?? incident.updatedAt ?? started),
        ...(url ? { shortlink: url } : {}),
      };
    });

    const scheduledMaintenances: ScheduledMaintenance[] = rawMaintenances
      .filter(isRecord)
      .map((maintenance, i) => {
        const start = String(
          maintenance.start ?? maintenance.started ?? maintenance.scheduledFor ?? "",
        );
        const durationMinutes = Number(maintenance.duration);
        const end =
          typeof maintenance.end === "string"
            ? maintenance.end
            : Number.isFinite(durationMinutes) && start
              ? new Date(new Date(start).getTime() + durationMinutes * 60_000).toISOString()
              : start;
        return {
          id: String(maintenance.id ?? maintenance.url ?? `maintenance-${i}`),
          title: String(maintenance.name ?? maintenance.title ?? "Maintenance"),
          status: mapMaintenanceStatus(String(maintenance.status ?? "")),
          scheduledFor: start,
          scheduledUntil: end,
          ...(typeof maintenance.url === "string" ? { description: maintenance.url } : {}),
        };
      });

    const pageStatus = mapPageStatus(String(page.status ?? ""));
    const overallStatus =
      pageStatus !== "unknown" ? pageStatus : calculateOverallStatus(monitors, activeIncidents);

    return {
      status: overallStatus,
      monitors,
      activeIncidents,
      scheduledMaintenances,
      // Public summary.json does not expose historical uptime percentages.
      uptime: { last24h: 100, last7d: 100, last30d: 100 },
      lastUpdated: new Date().toISOString(),
      pageUrl: typeof page.url === "string" ? page.url : baseUrl,
    };
  }
}

// ============================================
// Mapping helpers
// ============================================

function mapPageStatus(status: string): StatusState {
  switch (status.toUpperCase()) {
    case "UP":
    case "OPERATIONAL":
      return "operational";
    case "HASISSUES":
    case "HAS_ISSUES":
    case "DEGRADED":
      return "degraded";
    case "UNDERMAINTENANCE":
    case "UNDER_MAINTENANCE":
    case "MAINTENANCE":
      return "maintenance";
    case "DOWN":
    case "MAJOROUTAGE":
      return "major_outage";
    default:
      return "unknown";
  }
}

function mapComponentStatus(status: string): StatusState {
  switch (status.toUpperCase()) {
    case "OPERATIONAL":
    case "UP":
      return "operational";
    case "DEGRADEDPERFORMANCE":
    case "DEGRADED":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
    case "DOWN":
      return "major_outage";
    case "UNDERMAINTENANCE":
    case "MAINTENANCE":
      return "maintenance";
    default:
      return mapPageStatus(status);
  }
}

function mapIncidentStatus(status: string): IncidentStatus["status"] {
  switch (status.toUpperCase()) {
    case "INVESTIGATING":
      return "investigating";
    case "IDENTIFIED":
      return "identified";
    case "MONITORING":
      return "monitoring";
    case "RESOLVED":
      return "resolved";
    case "POSTMORTEM":
      return "postmortem";
    default:
      return "investigating";
  }
}

function mapImpact(impact: string): IncidentStatus["impact"] {
  switch (impact.toUpperCase().replace(/[_\s]/g, "")) {
    case "NONE":
      return "none";
    case "MINOR":
    case "MINOROUTAGE":
      return "minor";
    case "MAJOR":
    case "MAJOROUTAGE":
      return "major";
    case "CRITICAL":
    case "CRITICALOUTAGE":
      return "critical";
    default:
      return "minor";
  }
}

function mapMaintenanceStatus(status: string): ScheduledMaintenance["status"] {
  switch (status.toUpperCase().replace(/[_\s]/g, "")) {
    case "INPROGRESS":
    case "ONGOING":
      return "in_progress";
    case "COMPLETED":
    case "FINISHED":
      return "completed";
    case "NOTSTARTEDYET":
    case "SCHEDULED":
    default:
      return "scheduled";
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
