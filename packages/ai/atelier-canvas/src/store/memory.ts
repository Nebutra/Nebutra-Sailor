/**
 * In-memory CanvasStore — the default for tests and the flag-gated demo.
 *
 * Tenant isolation is enforced by keying on `tenantId:canvasId` and never
 * returning rows across tenants, mirroring what RLS does in the Prisma store.
 */

import type { AtelierCanvas, CanvasScene, CanvasStore } from "../types";

function key(tenantId: string, canvasId: string): string {
  return `${tenantId}:${canvasId}`;
}

const EMPTY_SCENE: CanvasScene = { elements: [], files: [] };

export class InMemoryCanvasStore implements CanvasStore {
  private readonly rows = new Map<string, AtelierCanvas>();

  async get(tenantId: string, canvasId: string): Promise<AtelierCanvas | null> {
    return this.rows.get(key(tenantId, canvasId)) ?? null;
  }

  async create(tenantId: string, canvasId: string, name: string): Promise<AtelierCanvas> {
    const row: AtelierCanvas = {
      id: canvasId,
      tenantId,
      name,
      scene: EMPTY_SCENE,
      updatedAt: new Date(),
    };
    this.rows.set(key(tenantId, canvasId), row);
    return row;
  }

  async save(
    tenantId: string,
    canvasId: string,
    scene: CanvasScene,
    thumbnail?: string,
  ): Promise<AtelierCanvas> {
    const existing = this.rows.get(key(tenantId, canvasId));
    const row: AtelierCanvas = {
      id: canvasId,
      tenantId,
      name: existing?.name ?? canvasId,
      scene,
      ...(thumbnail !== undefined ? { thumbnail } : {}),
      updatedAt: new Date(),
    };
    this.rows.set(key(tenantId, canvasId), row);
    return row;
  }

  async list(tenantId: string): Promise<readonly AtelierCanvas[]> {
    return [...this.rows.values()].filter((r) => r.tenantId === tenantId);
  }

  /** Test helper. */
  _clear(): void {
    this.rows.clear();
  }
}
