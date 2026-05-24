/**
 * Registry of per-package bespoke showcase components.
 *
 * The detail page (`/[lang]/features/[name]`) looks up the entry's slug
 * here. If a showcase is registered, it's rendered above the CodeBlock
 * section. Otherwise the page falls back to just the CodeBlock.
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

/** Slug → showcase component. */
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
