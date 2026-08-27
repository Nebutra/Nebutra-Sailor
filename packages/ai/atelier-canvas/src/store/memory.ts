/**
 * In-memory CanvasStore — the default for tests and the flag-gated demo.
 *
 * Storage mechanics (tenant-keyed map, never returning rows across tenants,
 * tenant-filtered listing) are delegated to `InMemoryTenantStore` from
 * `@nebutra/tenant-store`; this class only adds atelier's typed `create` /
 * `save` domain shape, mirroring what RLS does in the Prisma store.
 */

import { InMemoryTenantStore } from "@nebutra/tenant-store";
import type { AtelierCanvas, CanvasScene, CanvasStore } from "../types";

const EMPTY_SCENE: CanvasScene = { elements: [], files: [] };

export class InMemoryCanvasStore implements CanvasStore {
  private readonly base = new InMemoryTenantStore<AtelierCanvas>();

  async get(tenantId: string, canvasId: string): Promise<AtelierCanvas | null> {
    return this.base.read(tenantId, canvasId);
  }

  async create(tenantId: string, canvasId: string, name: string): Promise<AtelierCanvas> {
    const row: AtelierCanvas = {
      id: canvasId,
      tenantId,
      name,
      scene: EMPTY_SCENE,
      updatedAt: new Date(),
    };
    return this.base.write(tenantId, canvasId, row);
  }

  async save(
    tenantId: string,
    canvasId: string,
    scene: CanvasScene,
    thumbnail?: string,
  ): Promise<AtelierCanvas> {
    const existing = await this.base.read(tenantId, canvasId);
    const row: AtelierCanvas = {
      id: canvasId,
      tenantId,
      name: existing?.name ?? canvasId,
      scene,
      ...(thumbnail !== undefined ? { thumbnail } : {}),
      updatedAt: new Date(),
    };
    return this.base.write(tenantId, canvasId, row);
  }

  async list(tenantId: string): Promise<readonly AtelierCanvas[]> {
    return this.base.listByTenant(tenantId);
  }

  /** Test helper. */
  _clear(): void {
    this.base.clear();
  }
}
