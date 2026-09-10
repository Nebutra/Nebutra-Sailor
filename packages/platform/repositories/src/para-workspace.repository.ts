import type { ParaProject, ParaWorkspace, PrismaClient } from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";

/**
 * PARA projects + workspaces. The WorkspaceDocument is embedded in the workspace row;
 * `documentVersion` is the optimistic-concurrency token for silent autosave.
 * Construct tenant-scoped via `getParaWorkspaceRepository(tenantId)`.
 */

export class DocumentVersionConflictError extends Error {
  constructor(
    public readonly workspaceId: string,
    public readonly currentVersion: number,
    public readonly current: unknown,
  ) {
    super(`document version conflict on ${workspaceId} (current ${currentVersion})`);
    this.name = "DocumentVersionConflictError";
  }
}

export interface PutDocumentResult {
  workspace: ParaWorkspace;
}

export class ParaWorkspaceRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  // ── Projects ────────────────────────────────────────────────────────────────

  listProjects(limit = 50): Promise<ParaProject[]> {
    return this.prisma.paraProject.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  findProject(id: string): Promise<ParaProject | null> {
    return this.prisma.paraProject.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  createProject(name: string): Promise<ParaProject> {
    return this.prisma.paraProject.create({ data: { tenantId: this.tenantId, name } });
  }

  // ── Workspaces ──────────────────────────────────────────────────────────────

  listWorkspaces(projectId: string, limit = 100): Promise<ParaWorkspace[]> {
    return this.prisma.paraWorkspace.findMany({
      where: { tenantId: this.tenantId, projectId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  findWorkspace(id: string): Promise<ParaWorkspace | null> {
    return this.prisma.paraWorkspace.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  /** Zero-step create: auto-named, empty document. */
  async createWorkspace(projectId: string, name?: string): Promise<ParaWorkspace> {
    const count = await this.prisma.paraWorkspace.count({
      where: { tenantId: this.tenantId, projectId },
    });
    return this.prisma.paraWorkspace.create({
      data: {
        tenantId: this.tenantId,
        projectId,
        name: name ?? `Untitled ${count + 1}`,
        document: { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } },
        documentVersion: 1,
      },
    });
  }

  /**
   * Replace the document if `expectedVersion` matches; otherwise throw with the current row so the
   * caller can answer 409 with the server copy. Uses a conditional update so two autosaves cannot interleave.
   */
  async putDocument(
    id: string,
    expectedVersion: number,
    document: unknown,
  ): Promise<PutDocumentResult> {
    const result = await this.prisma.paraWorkspace.updateMany({
      where: { id, tenantId: this.tenantId, documentVersion: expectedVersion },
      data: { document: document as object, documentVersion: expectedVersion + 1 },
    });
    if (result.count === 1) {
      const workspace = await this.prisma.paraWorkspace.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!workspace) throw new Error(`workspace ${id} vanished after update`);
      return { workspace };
    }
    const current = await this.findWorkspace(id);
    if (!current) throw new Error(`workspace ${id} not found`);
    throw new DocumentVersionConflictError(id, current.documentVersion, current.document);
  }
}

export function getParaWorkspaceRepository(tenantId: string): ParaWorkspaceRepository {
  return new ParaWorkspaceRepository(getTenantDb(tenantId), tenantId);
}
