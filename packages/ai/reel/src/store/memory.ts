/**
 * In-memory ReelGraphStore — default for tests and the flag-gated demo.
 *
 * Tenant isolation by `tenantId:graphId` keying; never returns rows across
 * tenants — the same property the atelier-canvas Prisma store gets from RLS.
 * A production Prisma adapter mirrors this shape (one JSON blob per graph +
 * organization_id); deferred from the vertical slice.
 */

import type { ReelEdge, ReelGraph, ReelGraphStore, ReelNode } from "../types";

function key(tenantId: string, graphId: string): string {
  return `${tenantId}:${graphId}`;
}

export class InMemoryReelGraphStore implements ReelGraphStore {
  private readonly rows = new Map<string, ReelGraph>();

  async get(tenantId: string, graphId: string): Promise<ReelGraph | null> {
    return this.rows.get(key(tenantId, graphId)) ?? null;
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
    this.rows.set(key(tenantId, graphId), row);
    return row;
  }

  async save(
    tenantId: string,
    graphId: string,
    nodes: readonly ReelNode[],
    edges: readonly ReelEdge[],
  ): Promise<ReelGraph> {
    const existing = this.rows.get(key(tenantId, graphId));
    const row: ReelGraph = {
      id: graphId,
      tenantId,
      name: existing?.name ?? graphId,
      nodes,
      edges,
      updatedAt: new Date(),
    };
    this.rows.set(key(tenantId, graphId), row);
    return row;
  }

  async list(tenantId: string): Promise<readonly ReelGraph[]> {
    return [...this.rows.values()].filter((r) => r.tenantId === tenantId);
  }

  /** Test helper. */
  _clear(): void {
    this.rows.clear();
  }
}
