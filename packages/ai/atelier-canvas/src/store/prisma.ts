/**
 * Prisma-backed CanvasStore — the production persistence adapter.
 *
 * Decoupled from `@nebutra/db`'s generated client by a narrow structural
 * interface, so this package typechecks and tests without running
 * `prisma generate`. Wire it in the app by passing a `getDb` that returns
 * `getTenantDb(tenantId)` (RLS-scoped) — that is what enforces tenant
 * isolation at the database layer; this adapter never calls `getSystemDb()`.
 *
 * The `AtelierCanvas` Prisma model (see packages/platform/db/prisma/
 * schema.prisma) stores the scene as a single JSON column — the same
 * one-blob-per-canvas shape the source product used, but with an
 * `organization_id` column + RLS instead of an implicit single user.
 */

import type { AtelierCanvas, CanvasScene, CanvasStore } from "../types";

/** Row shape as persisted (scene/files as JSON). */
interface AtelierCanvasRow {
  id: string;
  organizationId: string;
  name: string;
  scene: unknown;
  thumbnail: string | null;
  updatedAt: Date;
}

/** The subset of the generated delegate this adapter needs. */
export interface AtelierCanvasDelegate {
  findUnique(args: {
    where: { organizationId_id: { organizationId: string; id: string } };
  }): Promise<AtelierCanvasRow | null>;
  upsert(args: {
    where: { organizationId_id: { organizationId: string; id: string } };
    create: Omit<AtelierCanvasRow, "updatedAt">;
    update: Partial<Omit<AtelierCanvasRow, "id" | "organizationId">>;
  }): Promise<AtelierCanvasRow>;
  findMany(args: { where: { organizationId: string } }): Promise<AtelierCanvasRow[]>;
}

export interface TenantDbLike {
  atelierCanvas: AtelierCanvasDelegate;
}

const EMPTY_SCENE: CanvasScene = { elements: [], files: [] };

function toDomain(row: AtelierCanvasRow): AtelierCanvas {
  const scene =
    row.scene && typeof row.scene === "object" ? (row.scene as CanvasScene) : EMPTY_SCENE;
  return {
    id: row.id,
    tenantId: row.organizationId,
    name: row.name,
    scene,
    ...(row.thumbnail ? { thumbnail: row.thumbnail } : {}),
    updatedAt: row.updatedAt,
  };
}

export class PrismaCanvasStore implements CanvasStore {
  /**
   * @param getDb returns an RLS-scoped tenant client. In the app:
   *   `new PrismaCanvasStore((t) => getTenantDb(t) as unknown as TenantDbLike)`
   */
  constructor(private readonly getDb: (tenantId: string) => Promise<TenantDbLike> | TenantDbLike) {}

  async get(tenantId: string, canvasId: string): Promise<AtelierCanvas | null> {
    const db = await this.getDb(tenantId);
    const row = await db.atelierCanvas.findUnique({
      where: { organizationId_id: { organizationId: tenantId, id: canvasId } },
    });
    return row ? toDomain(row) : null;
  }

  async create(tenantId: string, canvasId: string, name: string): Promise<AtelierCanvas> {
    const db = await this.getDb(tenantId);
    const row = await db.atelierCanvas.upsert({
      where: { organizationId_id: { organizationId: tenantId, id: canvasId } },
      create: {
        id: canvasId,
        organizationId: tenantId,
        name,
        scene: EMPTY_SCENE,
        thumbnail: null,
      },
      update: {},
    });
    return toDomain(row);
  }

  async save(
    tenantId: string,
    canvasId: string,
    scene: CanvasScene,
    thumbnail?: string,
  ): Promise<AtelierCanvas> {
    const db = await this.getDb(tenantId);
    const row = await db.atelierCanvas.upsert({
      where: { organizationId_id: { organizationId: tenantId, id: canvasId } },
      create: {
        id: canvasId,
        organizationId: tenantId,
        name: canvasId,
        scene,
        thumbnail: thumbnail ?? null,
      },
      update: { scene, thumbnail: thumbnail ?? null },
    });
    return toDomain(row);
  }

  async list(tenantId: string): Promise<readonly AtelierCanvas[]> {
    const db = await this.getDb(tenantId);
    const rows = await db.atelierCanvas.findMany({
      where: { organizationId: tenantId },
    });
    return rows.map(toDomain);
  }
}
