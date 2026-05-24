/**
 * Showcase registry — slug-specific first, group fallback second.
 *
 * The detail page (`/[lang]/features/[name]`) looks up the entry via
 * `resolveShowcase(slug, group)`:
 *   1. Slug-specific showcase from PACKAGE_SHOWCASES (15 hand-crafted)
 *   2. Group fallback from GROUP_SHOWCASES (8 templates that adapt per entry)
 *   3. null → page renders only the CodeBlock (no entries should hit this)
 */

import { AgentRuntimeShowcase } from "./agent-runtime-showcase";
import { AiGroupFallback } from "./ai-group-fallback";
import { AuditShowcase } from "./audit-showcase";
import { AuthShowcase } from "./auth-showcase";
import { BillingShowcase } from "./billing-showcase";
import { CacheShowcase } from "./cache-showcase";
import { CommerceGroupFallback } from "./commerce-group-fallback";
import { DbShowcase } from "./db-showcase";
import { DesignGroupFallback } from "./design-group-fallback";
import { GatewayCoreShowcase } from "./gateway-core-showcase";
import { GatewayGroupFallback } from "./gateway-group-fallback";
import { IamGroupFallback } from "./iam-group-fallback";
import { IntegrationsGroupFallback } from "./integrations-group-fallback";
import { KnowledgeRagShowcase } from "./knowledge-rag-showcase";
import { MeteringShowcase } from "./metering-showcase";
import { OpsGroupFallback } from "./ops-group-fallback";
import { PermissionsShowcase } from "./permissions-showcase";
import { PlatformGroupFallback } from "./platform-group-fallback";
import { QueueShowcase } from "./queue-showcase";
import { SearchShowcase } from "./search-showcase";
import { TokensShowcase } from "./tokens-showcase";
import type { PackageShowcase } from "./types";
import { VaultShowcase } from "./vault-showcase";
import { WebhooksShowcase } from "./webhooks-showcase";

export type { PackageShowcase, PackageShowcaseProps } from "./types";

/** Slug-specific showcases — hand-crafted for high-priority packages. */
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

/** Group-level fallbacks — adapt content per entry.slug / entry.label. */
export const GROUP_SHOWCASES: Record<string, PackageShowcase> = {
  ai: AiGroupFallback,
  iam: IamGroupFallback,
  integrations: IntegrationsGroupFallback,
  platform: PlatformGroupFallback,
  design: DesignGroupFallback,
  commerce: CommerceGroupFallback,
  gateway: GatewayGroupFallback,
  ops: OpsGroupFallback,
};

export function getPackageShowcase(slug: string): PackageShowcase | null {
  return PACKAGE_SHOWCASES[slug] ?? null;
}

export function getGroupShowcase(group: string): PackageShowcase | null {
  return GROUP_SHOWCASES[group] ?? null;
}

/** Resolve the best showcase for an entry: slug-specific → group fallback. */
export function resolveShowcase(slug: string, group: string): PackageShowcase | null {
  return getPackageShowcase(slug) ?? getGroupShowcase(group) ?? null;
}
