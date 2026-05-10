"use client";

/**
 * StatusBadge — compact status indicator dot
 *
 * @example OpenStatus (existing API, unchanged)
 *   <StatusBadge pageSlug="nebutra" showLabel />
 *
 * @example Atlassian Statuspage
 *   <StatusBadge provider="statuspage" pageId="kctbh9vrtdwd" showLabel />
 *
 * @example Static (no fetch)
 *   <StatusBadge status="operational" showLabel />
 */

import { useEffect, useState } from "react";
import { fetchStatusPage } from "../api";
import type { StatusConfig, StatusState } from "../types";

interface StatusBadgeProps {
  // Static value — skips fetch
  status?: StatusState;
  // OpenStatus
  pageSlug?: string;
  // Atlassian Statuspage
  provider?: "statuspage";
  pageId?: string;
  // Display
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<StatusState, { color: string; bgColor: string; label: string }> = {
  operational: {
    color: "text-green-600",
    bgColor: "bg-green-500",
    label: "All Systems Operational",
  },
  degraded: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    label: "Degraded Performance",
  },
  partial_outage: {
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    label: "Partial Outage",
  },
  major_outage: {
    color: "text-red-600",
    bgColor: "bg-red-500",
    label: "Major Outage",
  },
  maintenance: {
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    label: "Under Maintenance",
  },
  unknown: {
    color: "text-gray-500",
    bgColor: "bg-gray-400",
    label: "Status Unknown",
  },
};

const SIZE_CONFIG = {
  sm: { dot: "h-2 w-2", text: "text-xs" },
  md: { dot: "h-2.5 w-2.5", text: "text-sm" },
  lg: { dot: "h-3 w-3", text: "text-base" },
};

function buildConfig(props: StatusBadgeProps): StatusConfig | null {
  if (props.provider === "statuspage" && props.pageId) {
    return { provider: "statuspage", pageId: props.pageId };
  }
  if (props.pageSlug) {
    return { pageSlug: props.pageSlug };
  }
  return null;
}

export function StatusBadge({
  status: propStatus,
  pageSlug,
  provider,
  pageId,
  showLabel = false,
  size = "md",
  className = "",
  onClick,
}: StatusBadgeProps) {
  const [status, setStatus] = useState<StatusState>(propStatus ?? "unknown");
  const config = buildConfig({
    ...(pageSlug !== undefined ? { pageSlug } : {}),
    ...(provider !== undefined ? { provider } : {}),
    ...(pageId !== undefined ? { pageId } : {}),
  });
  const [loading, setLoading] = useState(!propStatus && !!config);

  useEffect(() => {
    if (propStatus) {
      setStatus(propStatus);
      return;
    }
    if (!config) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchStatusPage(config);
        setStatus(data.status);
      } catch {
        setStatus("unknown");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
    // config is stable within a render cycle — serialise to string for effect dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propStatus, config]);

  const cfg = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 transition-opacity hover:opacity-80 ${className}`}
      disabled={!onClick}
      aria-label={cfg.label}
    >
      <span className="relative flex">
        <span
          className={`${sizeConfig.dot} ${cfg.bgColor} rounded-full ${
            status === "operational" ? "animate-pulse" : ""
          }`}
        />
        {loading && (
          <span
            className={`absolute inset-0 ${sizeConfig.dot} animate-ping rounded-full bg-gray-400 opacity-75`}
          />
        )}
      </span>
      {showLabel && (
        <span className={`${sizeConfig.text} ${cfg.color} font-medium`}>{cfg.label}</span>
      )}
    </button>
  );
}

export default StatusBadge;
