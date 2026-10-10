/**
 * Showcase registry — hand-crafted, slug-specific product windows for the
 * packages that have one (db, auth, billing, ...). A package without one
 * shows its glyph instead. There is no per-group fallback: one parameterized
 * dashboard stamped across forty packages, with numbers seeded from each slug,
 * presented invented latencies and eval scores as that package's own.
 */

import type { PackageCatalogTranslator } from "../package-feature-data";
import { AgentRuntimeShowcase } from "./agent-runtime-showcase";
import { AuditShowcase } from "./audit-showcase";
import { AuthShowcase } from "./auth-showcase";
import { BillingShowcase } from "./billing-showcase";
import { CacheShowcase } from "./cache-showcase";
import { DbShowcase } from "./db-showcase";
import { GatewayCoreShowcase } from "./gateway-core-showcase";
import { KnowledgeRagShowcase } from "./knowledge-rag-showcase";
import { MeteringShowcase } from "./metering-showcase";
import { PermissionsShowcase } from "./permissions-showcase";
import { QueueShowcase } from "./queue-showcase";
import { SearchShowcase } from "./search-showcase";
import { TokensShowcase } from "./tokens-showcase";
import type { PackageShowcase } from "./types";
import { VaultShowcase } from "./vault-showcase";
import { WebhooksShowcase } from "./webhooks-showcase";

export type { PackageShowcase, PackageShowcaseProps } from "./types";

/** Hand-crafted, slug-specific showcases. */
export const PACKAGE_SHOWCASES: Record<string, PackageShowcase> = {
  "agent-runtime": AgentRuntimeShowcase,
  audit: AuditShowcase,
  auth: AuthShowcase,
  billing: BillingShowcase,
  cache: CacheShowcase,
  db: DbShowcase,
  "gateway-core": GatewayCoreShowcase,
  "knowledge-rag": KnowledgeRagShowcase,
  metering: MeteringShowcase,
  permissions: PermissionsShowcase,
  queue: QueueShowcase,
  search: SearchShowcase,
  tokens: TokensShowcase,
  vault: VaultShowcase,
  webhooks: WebhooksShowcase,
};

export function getPackageShowcase(slug: string): PackageShowcase | null {
  return PACKAGE_SHOWCASES[slug] ?? null;
}

const SHOWCASE_SLUGS_WITH_COPY = new Set([
  "agent-runtime",
  "audit",
  "auth",
  "billing",
  "cache",
  "db",
  "gateway-core",
  "knowledge-rag",
  "metering",
  "permissions",
  "queue",
  "search",
  "tokens",
  "vault",
  "webhooks",
]);

/**
 * Pre-resolved copy for the showcases' own labels/rows —
 * `packageCatalog.showcases.<slug>.*` in apps/landing/messages/*.json.
 * Showcases are Client Components, so the page builds this plain object
 * server-side (via `t.raw()` for the nested shapes) and passes it down as a
 * prop instead of putting the whole `packageCatalog` namespace on the client.
 */
export function getShowcaseCopy(
  slug: string,
  t: PackageCatalogTranslator,
): Record<string, unknown> | undefined {
  if (!SHOWCASE_SLUGS_WITH_COPY.has(slug)) return undefined;
  const copy = t.raw(`showcases.${slug}`) as Record<string, unknown>;
  if (slug === "search") {
    // STATS is a fixed demo figure baked into search-showcase.tsx; the
    // footer sentence needs those values interpolated server-side since the
    // showcase itself never calls next-intl.
    return { ...copy, footer: t("showcases.search.footer", { count: "12,401", ms: "38ms" }) };
  }
  return copy;
}
