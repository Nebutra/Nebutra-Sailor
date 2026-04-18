// =============================================================================
// @nebutra/metering — Provider-agnostic usage metering & billing pipeline
// =============================================================================
// Supports:
//   - ClickHouse  (production, high-throughput)
//   - In-memory   (dev/test only)
//
// Usage:
//   import { getMetering, API_CALLS } from "@nebutra/metering";
//
//   const metering = await getMetering();  // auto-detects provider
//   await metering.defineMeter(API_CALLS);
//   await metering.ingest({
//     meterId: "api_calls",
//     tenantId: "org_123",
//     value: 1,
//     properties: { endpoint: "/v1/chat", method: "POST" },
//   });
// =============================================================================

// ── Factory ─────────────────────────────────────────────────────────────────
export {
  closeMetering,
  createMetering,
  getMetering,
  setMetering,
} from "./factory";
// ── Standard Meters ─────────────────────────────────────────────────────────
export {
  ACTIVE_USERS,
  AI_TOKENS,
  ALL_STANDARD_METERS,
  API_CALLS,
  BANDWIDTH,
  COMPUTATION_TIME,
  DB_OPERATIONS,
  EMAIL_MESSAGES,
  REQUEST_LATENCY,
  STORAGE_BYTES,
  WEBHOOKS_FIRED,
} from "./meters";
// ── Middleware ───────────────────────────────────────────────────────────────
export {
  createMeteringWrapper,
  meterApiCall,
  meterOperation,
} from "./middleware";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { ClickHouseProvider } from "./providers/clickhouse";
export { MemoryProvider } from "./providers/memory";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  AggregationType,
  ClickHouseProviderConfig,
  MemoryProviderConfig,
  MeterDefinition,
  MeteringConfig,
  MeteringProvider,
  MeteringProviderType,
  MeterType,
  PeriodType,
  ThresholdAlert,
  UsageEvent,
  UsageQuota,
  UsageSummary,
} from "./types";

export {
  MeterDefinitionSchema,
  UsageEventSchema,
} from "./types";
