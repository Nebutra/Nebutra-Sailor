/**
 * StatusProvider — abstract interface + factory
 *
 * Dependency-inversion principle: components depend on this
 * interface, not on concrete OpenStatus/Statuspage SDKs.
 *
 * Usage:
 *   const provider = createStatusProvider({ provider: "statuspage", pageId: "abc123" });
 *   const data = await provider.fetchSummary();
 */

import { InternalStatusProvider } from "./providers/internal";
import { OpenStatusProvider } from "./providers/openstatus";
import { AtlassianStatuspageProvider } from "./providers/statuspage";
import type { StatusConfig, StatusPageData } from "./types";

// ============================================
// Abstract interface
// ============================================

export interface StatusProvider {
  fetchSummary(): Promise<StatusPageData>;
}

// ============================================
// Factory
// ============================================

export function createStatusProvider(config: StatusConfig): StatusProvider {
  if (config.provider === "statuspage") {
    return new AtlassianStatuspageProvider(config);
  }
  if (config.provider === "internal") {
    return new InternalStatusProvider(config);
  }
  // Default: openstatus (covers undefined provider field)
  return new OpenStatusProvider(config);
}
