/**
 * Showcase registry — hand-crafted, slug-specific product windows for the
 * packages that have one (db, auth, billing, ...). A package without one
 * shows its glyph instead. There is no per-group fallback: one parameterized
 * dashboard stamped across forty packages, with numbers seeded from each slug,
 * presented invented latencies and eval scores as that package's own.
 */

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
