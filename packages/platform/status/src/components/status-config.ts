/**
 * Shared props → StatusConfig mapping for React surfaces.
 * Keeps badge/widget in sync without coupling to concrete providers.
 */

import type { StatusConfig, StatusProviderType } from "../types";

export interface StatusSurfaceConfigProps {
  /** Explicit provider. Defaults to openstatus when pageSlug is set. */
  provider?: StatusProviderType;
  /** OpenStatus page slug (also used as subdomain convenience for other hosts). */
  pageSlug?: string;
  /** Atlassian Statuspage page id or base URL. */
  pageId?: string;
  /**
   * Full status page base URL for Better Stack / Instatus / custom Statuspage hosts.
   * Also accepted as an alias for pageId when provider is statuspage.
   */
  pageUrl?: string;
  /** Internal /health endpoint. */
  healthUrl?: string;
}

export function buildStatusConfig(props: StatusSurfaceConfigProps): StatusConfig | null {
  const provider = props.provider;

  if (provider === "statuspage") {
    const pageId = props.pageId ?? props.pageUrl;
    if (!pageId) return null;
    return { provider: "statuspage", pageId };
  }

  if (provider === "betterstack") {
    const pageUrl = props.pageUrl ?? props.pageId ?? props.pageSlug;
    if (!pageUrl) return null;
    return { provider: "betterstack", pageUrl };
  }

  if (provider === "instatus") {
    const pageUrl = props.pageUrl ?? props.pageId ?? props.pageSlug;
    if (!pageUrl) return null;
    return { provider: "instatus", pageUrl };
  }

  if (provider === "internal") {
    if (!props.healthUrl) return null;
    return { provider: "internal", healthUrl: props.healthUrl };
  }

  // openstatus (explicit or default)
  if (props.pageSlug) {
    return provider === "openstatus"
      ? { provider: "openstatus", pageSlug: props.pageSlug }
      : { pageSlug: props.pageSlug };
  }

  return null;
}
