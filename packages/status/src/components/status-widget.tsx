"use client";

/**
 * StatusWidget — full status panel with monitors, uptime, incidents,
 * and scheduled maintenances.
 *
 * @example OpenStatus (existing API, unchanged)
 *   <StatusWidget pageSlug="nebutra" />
 *
 * @example Atlassian Statuspage
 *   <StatusWidget provider="statuspage" pageId="kctbh9vrtdwd" />
 *
 * @example Statuspage with custom domain
 *   <StatusWidget provider="statuspage" pageId="https://status.example.com" />
 */

import { useEffect, useState } from "react";
import { fetchStatusPage } from "../api";
import type { StatusConfig, StatusPageData, StatusState } from "../types";

interface StatusWidgetProps {
  // OpenStatus
  pageSlug?: string;
  // Atlassian Statuspage
  provider?: "statuspage";
  pageId?: string;
  // Override the "View Status Page →" link
  statusPageUrl?: string;
  // Display toggles
  showMonitors?: boolean;
  showUptime?: boolean;
  showIncidents?: boolean;
  showMaintenances?: boolean;
  compact?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<
  StatusState,
  { bg: string; text: string; border: string; dot: string; icon: string }
> = {
  operational: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-500",
    icon: "✓",
  },
  degraded: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
    icon: "⚠",
  },
  partial_outage: {
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
    icon: "⚡",
  },
  major_outage: {
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    icon: "✕",
  },
  maintenance: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    icon: "🔧",
  },
  unknown: {
    bg: "bg-gray-50 dark:bg-gray-900",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
    icon: "?",
  },
};

const STATUS_LABELS: Record<StatusState, string> = {
  operational: "All Systems Operational",
  degraded: "Degraded Performance",
  partial_outage: "Partial System Outage",
  major_outage: "Major System Outage",
  maintenance: "Scheduled Maintenance",
  unknown: "Status Unknown",
};

function buildConfig(props: StatusWidgetProps): StatusConfig | null {
  if (props.provider === "statuspage" && props.pageId) {
    return { provider: "statuspage", pageId: props.pageId };
  }
  if (props.pageSlug) {
    return { pageSlug: props.pageSlug };
  }
  return null;
}

function deriveStatusPageUrl(props: StatusWidgetProps, data: StatusPageData): string {
  if (props.statusPageUrl) return props.statusPageUrl;
  if (data.pageUrl) return data.pageUrl;
  if (props.pageSlug) return `https://${props.pageSlug}.openstatus.dev`;
  return "#";
}

export function StatusWidget({
  pageSlug,
  provider,
  pageId,
  statusPageUrl,
  showMonitors = true,
  showUptime = true,
  showIncidents = true,
  showMaintenances = true,
  compact = false,
  className = "",
}: StatusWidgetProps) {
  const [data, setData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = buildConfig({
    ...(pageSlug !== undefined ? { pageSlug } : {}),
    ...(provider !== undefined ? { provider } : {}),
    ...(pageId !== undefined ? { pageId } : {}),
  });

  useEffect(() => {
    if (!config) {
      setLoading(false);
      setError("No status provider configured.");
      return;
    }

    const load = async () => {
      try {
        const result = await fetchStatusPage(config);
        setData(result);
        setError(null);
      } catch {
        setError("Failed to load status");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-lg border p-4 ${className}`}>
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}
      >
        <p className="text-gray-500 dark:text-gray-400">{error ?? "Unable to load status"}</p>
      </div>
    );
  }

  const style = STATUS_STYLES[data.status];
  const externalUrl = deriveStatusPageUrl(
    {
      ...(pageSlug !== undefined ? { pageSlug } : {}),
      ...(provider !== undefined ? { provider } : {}),
      ...(pageId !== undefined ? { pageId } : {}),
      ...(statusPageUrl !== undefined ? { statusPageUrl } : {}),
    },
    data,
  );

  return (
    <div className={`overflow-hidden rounded-lg border ${style.border} ${className}`}>
      {/* Header */}
      <div className={`${style.bg} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${style.text}`}>{style.icon}</span>
            <div>
              <h3 className={`font-semibold ${style.text}`}>{STATUS_LABELS[data.status]}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            View Status Page →
          </a>
        </div>
      </div>

      {/* Monitors / Components */}
      {showMonitors && data.monitors.length > 0 && !compact && (
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Service Status
          </h4>
          <div className="grid gap-2">
            {data.monitors.map((monitor) => {
              const monitorStyle = STATUS_STYLES[monitor.status];
              return (
                <div
                  key={monitor.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${monitorStyle.dot}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{monitor.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {monitor.latency !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {monitor.latency}ms
                      </span>
                    )}
                    <span className={`text-xs font-medium ${monitorStyle.text}`}>
                      {STATUS_LABELS[monitor.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Uptime */}
      {showUptime && !compact && (
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Uptime</h4>
          <div className="flex gap-4">
            {(
              [
                { label: "Last 24h", value: data.uptime.last24h },
                { label: "Last 7 days", value: data.uptime.last7d },
                { label: "Last 30 days", value: data.uptime.last30d },
              ] as const
            ).map(({ label, value }) => (
              <div key={label} className="flex-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {showIncidents && data.activeIncidents.length > 0 && (
        <div className="border-t border-gray-100 bg-red-50 p-4 dark:border-gray-800 dark:bg-red-950">
          <h4 className="mb-2 text-sm font-medium text-red-700 dark:text-red-300">
            Active Incidents
          </h4>
          <ul className="space-y-2">
            {data.activeIncidents.map((incident) => (
              <li key={incident.id} className="rounded-md bg-white p-2 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {incident.title}
                  </p>
                  {incident.shortlink && (
                    <a
                      href={incident.shortlink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Details →
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Status: {incident.status} · Impact: {incident.impact}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scheduled Maintenances */}
      {showMaintenances && data.scheduledMaintenances.length > 0 && (
        <div className="border-t border-gray-100 bg-blue-50 p-4 dark:border-gray-800 dark:bg-blue-950">
          <h4 className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            Scheduled Maintenance
          </h4>
          <ul className="space-y-2">
            {data.scheduledMaintenances.map((m) => (
              <li key={m.id} className="rounded-md bg-white p-2 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(m.scheduledFor).toLocaleString()} –{" "}
                  {new Date(m.scheduledUntil).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StatusWidget;
