/**
 * In-memory ReelGraphStore — default for tests and the flag-gated demo.
 *
 * Storage mechanics (tenant-keyed map, never returning rows across tenants,
 * tenant-filtered listing) are delegated to `InMemoryTenantStore` from
 * `@nebutra/tenant-store`; this class only adds reel's typed `create` / `save`
 * domain shape. A production Prisma adapter mirrors the same read contract
 * (one JSON blob per graph + organization_id + RLS).
 */

import { InMemoryTenantStore } from "@nebutra/tenant-store";
import type { ReelEdge, ReelGraph, ReelGraphStore, ReelNode } from "../types";

export class InMemoryReelGraphStore implements ReelGraphStore {
  private readonly base = new InMemoryTenantStore<ReelGraph>();

  async get(tenantId: string, graphId: string): Promise<ReelGraph | null> {
    return this.base.read(tenantId, graphId);
  }

  async create(tenantId: string, graphId: string, name: string): Promise<ReelGraph> {
    const row: ReelGraph = {
      id: graphId,
      tenantId,
      name,
      nodes: [],
      edges: [],
      updatedAt: new Date(),
    };
    return this.base.write(tenantId, graphId, row);
  }

  async save(
    tenantId: string,
    graphId: string,
    nodes: readonly ReelNode[],
    edges: readonly ReelEdge[],
  ): Promise<ReelGraph> {
    const existing = await this.base.read(tenantId, graphId);
    const row: ReelGraph = {
      id: graphId,
      tenantId,
      name: existing?.name ?? graphId,
      nodes,
      edges,
      updatedAt: new Date(),
    };
    return this.base.write(tenantId, graphId, row);
  }

  async list(tenantId: string): Promise<readonly ReelGraph[]> {
    return this.base.listByTenant(tenantId);
  }

  /** Test helper. */
  _clear(): void {
    this.base.clear();
  }
}
