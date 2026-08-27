/**
 * Better Stack (Better Uptime) Status Page Provider
 *
 * Public JSON API (no auth):
 *   GET https://status.example.com/index.json
 *
 * Docs: https://betterstack.com/docs/uptime/status-pages/subscribing-to-status-updates/subscribing-to-api/
 *
 * Payload is JSON:API-ish: `{ data: status_page, included: [sections, resources, reports, updates] }`.
 */

import type { StatusProvider } from "../provider";
import type {
  BetterstackConfig,
  IncidentStatus,
  MonitorStatus,
  ScheduledMaintenance,
  StatusPageData,
  StatusState,
} from "../types";
import { calculateOverallStatus, fetchWithStatusTimeout, getDefaultStatusData } from "./shared";

const SECONDS_PER_DAY = 86_400;

export class BetterstackStatusProvider implements StatusProvider {
  private readonly config: BetterstackConfig;

  constructor(config: BetterstackConfig) {
    this.config = config;
  }

  async fetchSummary(): Promise<StatusPageData> {
    const baseUrl = this.resolveBaseUrl();
    const url = `${baseUrl}/index.json`;

    try {
      const response = await fetchWithStatusTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        throw new Error(`Better Stack API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transform(data, baseUrl);
    } catch {
      return getDefaultStatusData();
    }
  }

  /**
   * Prefer explicit apiUrl, then full pageUrl, then Better Uptime subdomain.
   */
  private resolveBaseUrl(): string {
    if (this.config.apiUrl) return trimTrailingSlash(this.config.apiUrl);
    if (this.config.pageUrl.startsWith("http")) {
      return trimTrailingSlash(this.config.pageUrl);
    }
    return `https://${this.config.pageUrl}.betteruptime.com`;
  }

  private transform(payload: Record<string, unknown>, baseUrl: string): StatusPageData {
    const data =
      typeof payload.data === "object" && payload.data !== null
        ? (payload.data as Record<string, unknown>)
        : {};
    const attributes =
      typeof data.attributes === "object" && data.attributes !== null
        ? (data.attributes as Record<string, unknown>)
        : {};
    const included = Array.isArray(payload.included) ? payload.included : [];

    const resources = included.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && item.type === "status_page_resource",
    );
    const reports = included.filter(
      (item): item is Record<string, unknown> => isRecord(item) && item.type === "status_report",
    );

    const monitors: MonitorStatus[] = resources.map((resource) => {
      const attrs = asRecord(resource.attributes);
      const availability =
        typeof attrs.availability === "number" ? attrs.availability * 100 : undefined;
      return {
        id: String(resource.id ?? attrs.resource_id ?? ""),
        name: String(attrs.public_name ?? attrs.name ?? resource.id ?? "Resource"),
        status: mapResourceStatus(String(attrs.status ?? "")),
        ...(availability !== undefined ? { uptime: availability } : {}),
        ...(typeof attrs.explanation === "string" && attrs.explanation
          ? { description: attrs.explanation }
          : {}),
      };
    });

    const activeIncidents: IncidentStatus[] = [];
    const scheduledMaintenances: ScheduledMaintenance[] = [];

    for (const report of reports) {
      const attrs = asRecord(report.attributes);
      const aggregate = String(attrs.aggregate_state ?? "").toLowerCase();
      const reportType = String(attrs.report_type ?? "").toLowerCase();
      const title = String(attrs.title ?? "Untitled");
      const startsAt = String(attrs.starts_at ?? "");
      const endsAt = typeof attrs.ends_at === "string" ? attrs.ends_at : undefined;
      const id = String(report.id ?? title);

      if (reportType === "maintenance" || reportType === "scheduled") {
        if (aggregate === "resolved" || aggregate === "completed") continue;
        scheduledMaintenances.push({
          id,
          title,
          status: mapMaintenanceState(aggregate),
          scheduledFor: startsAt,
          scheduledUntil: endsAt ?? startsAt,
        });
        continue;
      }

      // Manual / automated incident reports
      if (aggregate === "resolved") continue;
      activeIncidents.push({
        id,
        title,
        status: mapIncidentState(aggregate),
        impact: mapImpactFromState(aggregate),
        createdAt: startsAt,
        updatedAt: endsAt ?? startsAt,
        ...(endsAt ? { resolvedAt: endsAt } : {}),
        shortlink: `${baseUrl}/incidents/${id}`,
      });
    }

    const overallFromPage = mapAggregateState(String(attributes.aggregate_state ?? ""));
    const overallStatus =
      overallFromPage !== "unknown"
        ? overallFromPage
        : calculateOverallStatus(monitors, activeIncidents);

    const pageUrl =
      typeof attributes.custom_domain === "string" && attributes.custom_domain
        ? `https://${attributes.custom_domain}`
        : typeof attributes.subdomain === "string" && attributes.subdomain
          ? `https://${attributes.subdomain}.betteruptime.com`
          : baseUrl;

    return {
      status: overallStatus,
      monitors,
      activeIncidents,
      scheduledMaintenances,
      uptime: computeUptimeFromResources(resources),
      lastUpdated:
        typeof attributes.updated_at === "string"
          ? attributes.updated_at
          : new Date().toISOString(),
      pageUrl,
    };
  }
}

// ============================================
// Mapping helpers
// ============================================

function mapAggregateState(state: string): StatusState {
  switch (state.toLowerCase()) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "downtime":
    case "down":
      return "major_outage";
    case "maintenance":
    case "under_maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

function mapResourceStatus(status: string): StatusState {
  switch (status.toLowerCase()) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "downtime":
    case "down":
      return "major_outage";
    case "maintenance":
    case "under_maintenance":
      return "maintenance";
    case "not_monitored":
      return "unknown";
    default:
      return mapAggregateState(status);
  }
}

function mapIncidentState(aggregate: string): IncidentStatus["status"] {
  switch (aggregate.toLowerCase()) {
    case "investigating":
      return "investigating";
    case "identified":
      return "identified";
    case "monitoring":
      return "monitoring";
    case "resolved":
      return "resolved";
    default:
      // Better Stack often uses degraded/downtime as aggregate while open
      return "investigating";
  }
}

function mapImpactFromState(aggregate: string): IncidentStatus["impact"] {
  switch (aggregate.toLowerCase()) {
    case "downtime":
    case "down":
    case "major_outage":
      return "major";
    case "degraded":
    case "partial_outage":
      return "minor";
    case "critical":
      return "critical";
    case "operational":
    case "resolved":
      return "none";
    default:
      return "minor";
  }
}

function mapMaintenanceState(aggregate: string): ScheduledMaintenance["status"] {
  switch (aggregate.toLowerCase()) {
    case "in_progress":
    case "maintenance":
      return "in_progress";
    case "completed":
    case "resolved":
      return "completed";
    default:
      return "scheduled";
  }
}

function computeUptimeFromResources(resources: Record<string, unknown>[]): {
  last24h: number;
  last7d: number;
  last30d: number;
} {
  if (resources.length === 0) {
    return { last24h: 100, last7d: 100, last30d: 100 };
  }

  const availabilities: number[] = [];
  const dayBuckets = new Map<string, { downtime: number; count: number }>();

  for (const resource of resources) {
    const attrs = asRecord(resource.attributes);
    if (typeof attrs.availability === "number") {
      availabilities.push(attrs.availability * 100);
    }
    const history = Array.isArray(attrs.status_history) ? attrs.status_history : [];
    for (const entry of history) {
      if (!isRecord(entry) || typeof entry.day !== "string") continue;
      const downtime = typeof entry.downtime_duration === "number" ? entry.downtime_duration : 0;
      const bucket = dayBuckets.get(entry.day) ?? { downtime: 0, count: 0 };
      bucket.downtime += downtime;
      bucket.count += 1;
      dayBuckets.set(entry.day, bucket);
    }
  }

  const avgAvailability =
    availabilities.length > 0
      ? availabilities.reduce((a, b) => a + b, 0) / availabilities.length
      : 100;

  if (dayBuckets.size === 0) {
    return {
      last24h: round2(avgAvailability),
      last7d: round2(avgAvailability),
      last30d: round2(avgAvailability),
    };
  }

  const sortedDays = [...dayBuckets.keys()].sort();
  const uptimeForLast = (n: number): number => {
    const slice = sortedDays.slice(-n);
    if (slice.length === 0) return avgAvailability;
    let total = 0;
    for (const day of slice) {
      const bucket = dayBuckets.get(day);
      if (!bucket || bucket.count === 0) {
        total += 100;
        continue;
      }
      const avgDowntime = bucket.downtime / bucket.count;
      total += Math.max(0, Math.min(100, 100 * (1 - avgDowntime / SECONDS_PER_DAY)));
    }
    return total / slice.length;
  };

  return {
    last24h: round2(uptimeForLast(1)),
    last7d: round2(uptimeForLast(7)),
    last30d: round2(uptimeForLast(30)),
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
