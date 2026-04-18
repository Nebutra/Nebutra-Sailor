/**
 * Package status registry for the create-sailor CLI.
 *
 * Source of truth: the `nebutra` block inside each package's `package.json`.
 * This file mirrors that classification and maps CLI provider ids (e.g.
 * `bullmq`, `meilisearch`) to the status of the underlying `@nebutra/*`
 * package so the CLI can warn users before they select stub-level providers.
 *
 * Keep this file in sync with `packages/<pkg>/package.json` → `nebutra.status`.
 */

export type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

/**
 * Status of each Nebutra package that the CLI exposes to end users.
 * Packages not listed here are considered `"stable"` by default.
 */
export const NEBUTRA_PACKAGE_STATUS: Record<string, PackageStatus> = {
  // Foundation — types + factory complete, adapters need external creds
  metering: "foundation",
  notifications: "foundation",
  permissions: "foundation",
  queue: "foundation",
  search: "foundation",
  tenant: "foundation",
  uploads: "foundation",
  vault: "foundation",
  webhooks: "foundation",
  // WIP — actively under development, do not use in production
  audit: "wip",
  "feature-flags": "wip",
  "ai-providers": "wip",
  captcha: "wip",
  "event-bus": "wip",
  legal: "wip",
  mcp: "wip",
  saga: "wip",
};

/**
 * Maps CLI provider ids (the values users pass to `--queue`, `--search`,
 * etc.) to the status of the Nebutra package that powers them.
 *
 * The `none` provider is omitted — it opts out of the feature entirely,
 * so status warnings are not relevant.
 */
export const PROVIDER_STATUS: Record<string, PackageStatus> = {
  // Queue (@nebutra/queue → foundation)
  qstash: "foundation",
  bullmq: "foundation",
  upstash: "foundation",
  sqs: "foundation",
  // Search (@nebutra/search → foundation)
  meilisearch: "foundation",
  typesense: "foundation",
  algolia: "foundation",
  pgvector: "foundation",
  // Notifications (@nebutra/notifications → foundation)
  novu: "foundation",
  knock: "foundation",
  // "custom" intentionally omitted — user-provided dispatcher, not a Nebutra stub
  // Webhooks (@nebutra/webhooks → foundation)
  svix: "foundation",
  // Feature flags (@nebutra/feature-flags → wip)
  "vercel-flags": "wip",
  growthbook: "wip",
  configcat: "wip",
  // Captcha (@nebutra/captcha → wip)
  turnstile: "wip",
  hcaptcha: "wip",
  "aliyun-slide": "wip",
};

/**
 * Which create-sailor CLI flag each provider id belongs to. Used when
 * emitting JSON warnings / done-card summaries so the user sees context
 * (`queue=bullmq` is clearer than `bullmq` alone).
 */
export const PROVIDER_FLAG_BY_ID: Record<string, string> = {
  qstash: "queue",
  bullmq: "queue",
  upstash: "queue",
  sqs: "queue",
  meilisearch: "search",
  typesense: "search",
  algolia: "search",
  pgvector: "search",
  novu: "notifications",
  knock: "notifications",
  svix: "webhooks",
  "vercel-flags": "feature-flags",
  growthbook: "feature-flags",
  configcat: "feature-flags",
  turnstile: "captcha",
  hcaptcha: "captcha",
  "aliyun-slide": "captcha",
};

export interface PreviewSelection {
  flag: string;
  provider: string;
  status: PackageStatus;
}

/**
 * Return the status for a CLI provider id. Unknown ids are assumed stable.
 */
export function getProviderStatus(providerId: string | undefined): PackageStatus {
  if (!providerId) return "stable";
  return PROVIDER_STATUS[providerId] ?? "stable";
}

/**
 * Human-readable badge for inclusion in CLI labels / warnings.
 * Returns an empty string for `stable` so the UI stays clean in the default case.
 */
export function formatStatusBadge(status: PackageStatus): string {
  switch (status) {
    case "stable":
      return "";
    case "foundation":
      return "[Foundation]";
    case "wip":
      return "[WIP]";
    case "deprecated":
      return "[Deprecated]";
  }
}

/**
 * Longer human-readable description of a status — used in CLI warning
 * messages and the post-install done card.
 */
export function describeStatus(status: PackageStatus): string {
  switch (status) {
    case "stable":
      return "Production-ready.";
    case "foundation":
      return "Foundation status — types + factory are complete, but provider adapters are stub-level and require external credentials.";
    case "wip":
      return "WIP — actively being built, should not be used in production.";
    case "deprecated":
      return "Deprecated — scheduled for removal, do not use.";
  }
}

/**
 * Collect every non-stable provider selection that was made by the user,
 * so callers can emit warnings, update the done card, etc.
 */
export function collectPreviewSelections(
  selections: ReadonlyArray<{ flag: string; provider: string | undefined }>,
): PreviewSelection[] {
  const result: PreviewSelection[] = [];
  for (const { flag, provider } of selections) {
    if (!provider || provider === "none") continue;
    const status = getProviderStatus(provider);
    if (status === "stable") continue;
    result.push({ flag, provider, status });
  }
  return result;
}
