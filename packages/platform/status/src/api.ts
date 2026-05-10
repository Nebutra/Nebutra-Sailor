/**
 * Public API — thin facade over the provider system
 *
 * Backwards-compatible: existing callers using fetchStatusPage({ pageSlug })
 * continue to work unchanged (defaults to OpenStatus provider).
 */

import { createStatusProvider } from "./provider";
import type { OpenStatusConfig, StatusConfig, StatusPageData } from "./types";

/**
 * Fetch status page data using the configured provider.
 *
 * @example OpenStatus (default, backwards-compatible)
 *   await fetchStatusPage({ pageSlug: "nebutra" })
 *
 * @example Atlassian Statuspage
 *   await fetchStatusPage({ provider: "statuspage", pageId: "kctbh9vrtdwd" })
 *
 * @example Custom Statuspage domain
 *   await fetchStatusPage({ provider: "statuspage", pageId: "https://status.example.com" })
 *
 * @example Internal health endpoint
 *   await fetchStatusPage({ provider: "internal", healthUrl: "https://api.example.com/health" })
 */
export async function fetchStatusPage(
  config: StatusConfig | OpenStatusConfig,
): Promise<StatusPageData> {
  const provider = createStatusProvider(config as StatusConfig);
  return provider.fetchSummary();
}

// Re-export for consumers that want to build their own provider instance
export { createStatusProvider } from "./provider";
