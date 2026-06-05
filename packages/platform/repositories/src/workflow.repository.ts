import type { PrismaClient, WorkflowDefinition, WorkflowStatus } from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface CreateWorkflowData {
  name: string;
  scriptSource: string;
  description?: string | null;
  defaultModel?: string;
  maxConcurrency?: number;
  maxAgentsPerRun?: number;
  maxRetries?: number;
  timeoutMs?: number;
  status?: WorkflowStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkflowData {
  name?: string;
  scriptSource?: string;
  description?: string | null;
  defaultModel?: string;
  maxConcurrency?: number;
  maxAgentsPerRun?: number;
  maxRetries?: number;
  timeoutMs?: number;
  status?: WorkflowStatus;
}

/**
 * Repository seam for tenant-authored workflow definitions. `scriptSource` is
 * untrusted JS — this layer only stores/retrieves it; execution happens ONLY in
 * the QuickJS sandbox (workflow-runtime), never here.
 */
export class WorkflowRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async list(): Promise<WorkflowDefinition[]> {
    return this.prisma.workflowDefinition.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPaginated(
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<WorkflowDefinition>> {
    const { cursor, take } = normalizePaginationParams(params);
    const items = await this.prisma.workflowDefinition.findMany({
      where: { tenantId: this.tenantId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });
    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;
    return {
      items: trimmed,
      nextCursor: hasMore ? (trimmed[trimmed.length - 1]?.id ?? null) : null,
      hasNextPage: hasMore,
    };
  }

  async findById(id: string): Promise<WorkflowDefinition | null> {
    return this.prisma.workflowDefinition.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  async create(data: CreateWorkflowData): Promise<WorkflowDefinition> {
    return this.prisma.workflowDefinition.create({
      data: {
        tenantId: this.tenantId,
        name: data.name,
        scriptSource: data.scriptSource,
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.defaultModel ? { defaultModel: data.defaultModel } : {}),
        ...(data.maxConcurrency !== undefined ? { maxConcurrency: data.maxConcurrency } : {}),
        ...(data.maxAgentsPerRun !== undefined ? { maxAgentsPerRun: data.maxAgentsPerRun } : {}),
        ...(data.maxRetries !== undefined ? { maxRetries: data.maxRetries } : {}),
        ...(data.timeoutMs !== undefined ? { timeoutMs: data.timeoutMs } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.metadata ? { metadata: data.metadata as object } : {}),
      },
    });
  }

  async update(id: string, data: UpdateWorkflowData): Promise<WorkflowDefinition> {
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.scriptSource !== undefined ? { scriptSource: data.scriptSource } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.defaultModel !== undefined ? { defaultModel: data.defaultModel } : {}),
        ...(data.maxConcurrency !== undefined ? { maxConcurrency: data.maxConcurrency } : {}),
        ...(data.maxAgentsPerRun !== undefined ? { maxAgentsPerRun: data.maxAgentsPerRun } : {}),
        ...(data.maxRetries !== undefined ? { maxRetries: data.maxRetries } : {}),
        ...(data.timeoutMs !== undefined ? { timeoutMs: data.timeoutMs } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflowDefinition.delete({ where: { id } });
  }
}

export function getWorkflowRepository(tenantId: string): WorkflowRepository {
  return new WorkflowRepository(getTenantDb(tenantId), tenantId);
}
