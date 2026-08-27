/**
 * Showcase registry — every feature detail page renders one of these.
 *
 * Two tiers, both equally polished:
 *   - PACKAGE_SHOWCASES — hand-crafted, slug-specific designs for the
 *     top-tier packages (db, auth, billing, ...).
 *   - GROUP_SHOWCASES — parameterized designs for entire capability
 *     groups (ai, iam, integrations, ...). Each one adapts content per
 *     entry.slug / entry.label / entry.children so two siblings inside
 *     the same group still render distinctly.
 *
 * `resolveShowcase(slug, group)` checks slug-specific first, then group.
 */

import { AgentRuntimeShowcase } from "./agent-runtime-showcase";
import { AiGroupShowcase } from "./ai-group-showcase";
import { AuditShowcase } from "./audit-showcase";
import { AuthShowcase } from "./auth-showcase";
import { BillingShowcase } from "./billing-showcase";
import { CacheShowcase } from "./cache-showcase";
import { CommerceGroupShowcase } from "./commerce-group-showcase";
import { DbShowcase } from "./db-showcase";
import { DesignGroupShowcase } from "./design-group-showcase";
import { GatewayCoreShowcase } from "./gateway-core-showcase";
import { GatewayGroupShowcase } from "./gateway-group-showcase";
import { IamGroupShowcase } from "./iam-group-showcase";
import { IntegrationsGroupShowcase } from "./integrations-group-showcase";
import { KnowledgeRagShowcase } from "./knowledge-rag-showcase";
import { MeteringShowcase } from "./metering-showcase";
import { OpsGroupShowcase } from "./ops-group-showcase";
import { PermissionsShowcase } from "./permissions-showcase";
import { PlatformGroupShowcase } from "./platform-group-showcase";
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

/** Group-level showcases — adapt content per entry.slug / entry.label. */
export const GROUP_SHOWCASES: Record<string, PackageShowcase> = {
  ai: AiGroupShowcase,
  iam: IamGroupShowcase,
  integrations: IntegrationsGroupShowcase,
  platform: PlatformGroupShowcase,
  design: DesignGroupShowcase,
  commerce: CommerceGroupShowcase,
  gateway: GatewayGroupShowcase,
  ops: OpsGroupShowcase,
};

export function getPackageShowcase(slug: string): PackageShowcase | null {
  return PACKAGE_SHOWCASES[slug] ?? null;
}

export function getGroupShowcase(group: string): PackageShowcase | null {
  return GROUP_SHOWCASES[group] ?? null;
}

/** Resolve the showcase for an entry — slug-specific first, then group. */
export function resolveShowcase(slug: string, group: string): PackageShowcase | null {
  return getPackageShowcase(slug) ?? getGroupShowcase(group) ?? null;
}
