/**
 * @nebutra/status
 *
 * Multi-provider status page integration.
 * Supports OpenStatus, Atlassian Statuspage, and internal /health endpoints.
 *
 * @example OpenStatus
 *   import { StatusBadge } from "@nebutra/status"
 *   <StatusBadge pageSlug="nebutra" showLabel />
 *
 * @example Atlassian Statuspage
 *   <StatusBadge provider="statuspage" pageId="kctbh9vrtdwd" showLabel />
 *   <StatusWidget provider="statuspage" pageId="kctbh9vrtdwd" />
 *
 * @example Programmatic
 *   import { createStatusProvider } from "@nebutra/status"
 *   const provider = createStatusProvider({ provider: "statuspage", pageId: "abc" })
 *   const data = await provider.fetchSummary()
 */

// Public API
export { createStatusProvider, fetchStatusPage } from "./api";
// Components
export * from "./components/status-badge";
export * from "./components/status-widget";

// Provider interface (for custom providers)
export type { StatusProvider } from "./provider";

// All types
export type {
  IncidentStatus,
  InternalStatusConfig,
  MonitorStatus,
  OpenStatusConfig,
  ScheduledMaintenance,
  StatusConfig,
  StatusPageData,
  StatusProviderType,
  StatuspageConfig,
  StatusState,
} from "./types";
