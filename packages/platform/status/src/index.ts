/**
 * @nebutra/status
 *
 * Multi-provider status page integration.
 * Supports OpenStatus, Atlassian Statuspage, Better Stack, Instatus,
 * and internal /health endpoints.
 *
 * @example OpenStatus
 *   import { StatusBadge } from "@nebutra/status"
 *   <StatusBadge pageSlug="nebutra" showLabel />
 *
 * @example Atlassian Statuspage
 *   <StatusBadge provider="statuspage" pageId="kctbh9vrtdwd" showLabel />
 *   <StatusWidget provider="statuspage" pageId="kctbh9vrtdwd" />
 *
 * @example Better Stack
 *   <StatusBadge provider="betterstack" pageUrl="https://status.example.com" showLabel />
 *
 * @example Instatus
 *   <StatusBadge provider="instatus" pageUrl="https://status.example.com" showLabel />
 *
 * @example Programmatic
 *   import { createStatusProvider } from "@nebutra/status"
 *   const provider = createStatusProvider({ provider: "betterstack", pageUrl: "https://status.example.com" })
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
  BetterstackConfig,
  IncidentStatus,
  InstatusConfig,
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
