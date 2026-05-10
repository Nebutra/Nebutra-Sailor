/**
 * Shared status types — provider-agnostic
 *
 * Supports:
 *  - OpenStatus        (provider: "openstatus")
 *  - Atlassian Statuspage (provider: "statuspage")
 *  - Internal /health  (provider: "internal")
 */

// ============================================
// Core status vocabulary
// ============================================

export type StatusState =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

export interface MonitorStatus {
  id: string;
  name: string;
  status: StatusState;
  latency?: number;
  uptime?: number; // percentage (0–100)
  lastChecked?: string;
  region?: string;
  description?: string;
}

export interface IncidentStatus {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";
  impact: "none" | "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  shortlink?: string;
}

export interface StatusPageData {
  status: StatusState;
  monitors: MonitorStatus[];
  activeIncidents: IncidentStatus[];
  scheduledMaintenances: ScheduledMaintenance[];
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  lastUpdated: string;
  pageUrl?: string;
}

export interface ScheduledMaintenance {
  id: string;
  title: string;
  status: "scheduled" | "in_progress" | "completed";
  scheduledFor: string;
  scheduledUntil: string;
  description?: string;
}

// ============================================
// Provider configs (discriminated union)
// ============================================

export type StatusProviderType = "openstatus" | "statuspage" | "internal";

export interface OpenStatusConfig {
  provider?: "openstatus";
  /** The slug used on openstatus.dev, e.g. "nebutra" → nebutra.openstatus.dev */
  pageSlug: string;
  apiUrl?: string;
  refreshInterval?: number; // ms, default 60_000
}

export interface StatuspageConfig {
  provider: "statuspage";
  /**
   * The page ID or subdomain from statuspage.io.
   * e.g. "kctbh9vrtdwd" for https://kctbh9vrtdwd.statuspage.io
   * OR a full custom domain base URL: "https://status.example.com"
   */
  pageId: string;
  /** Override API base URL (e.g. for custom domains: "https://status.example.com") */
  apiUrl?: string;
  refreshInterval?: number;
}

export interface InternalStatusConfig {
  provider: "internal";
  /** Full URL to the /health endpoint */
  healthUrl: string;
  refreshInterval?: number;
}

export type StatusConfig = OpenStatusConfig | StatuspageConfig | InternalStatusConfig;
