import type { PrismaClient, WorkflowRun, WorkflowRunStatus } from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface StartWorkflowRunData {
  workflowId: string;
  threadId: string;
  idempotencyKey: string;
  args?: unknown;
  triggeredBy?: string;
}

export interface FinishWorkflowRunData {
  status: WorkflowRunStatus;
  result?: unknown;
  error?: string | null;
  events?: unknown[];
  stats?: Record<string, unknown>;
  tokenUsage?: Record<string, unknown>;
}

// Cloud rows can't grow unbounded like a local file — cap the captured payloads.
const RESULT_MAX_BYTES = 64_000;
const EVENTS_MAX = 500;

function capJson(value: unknown, maxBytes: number): unknown {
  try {
    const s = JSON.stringify(value);
    if (s.length <= maxBytes) return value;
    return { _truncated: true, preview: s.slice(0, maxBytes) };
  } catch {
    return { _unserializable: true };
  }
}

/**
 * Append-only run log for workflow executions. Construct tenant-scoped via
 * `getWorkflowRunRepository(tenantId)`. Only status/result fields are mutated
 * after the initial QUEUED/RUNNING insert.
 */
export class WorkflowRunRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  /** Idempotent on (tenantId, idempotencyKey) — a retry returns the existing row. */
  async start(data: StartWorkflowRunData): Promise<WorkflowRun> {
    try {
      return await this.prisma.workflowRun.create({
        data: {
          tenantId: this.tenantId,
          workflowId: data.workflowId,
          threadId: data.threadId,
          idempotencyKey: data.idempotencyKey,
          status: "RUNNING",
          ...(data.args !== undefined ? { args: data.args as object } : {}),
          ...(data.triggeredBy ? { triggeredBy: data.triggeredBy } : {}),
          startedAt: new Date(),
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        const existing = await this.prisma.workflowRun.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: this.tenantId,
              idempotencyKey: data.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async finish(runId: string, data: FinishWorkflowRunData): Promise<WorkflowRun> {
    return this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: data.status,
        finishedAt: new Date(),
        ...(data.result !== undefined
          ? { result: capJson(data.result, RESULT_MAX_BYTES) as object }
          : {}),
        ...(data.error !== undefined ? { error: data.error } : {}),
        ...(data.events ? { events: capJson(data.events.slice(-EVENTS_MAX), RESULT_MAX_BYTES) as object } : {}),
        ...(data.stats ? { stats: data.stats as object } : {}),
        ...(data.tokenUsage ? { tokenUsage: data.tokenUsage as object } : {}),
      },
    });
  }

  async findById(runId: string): Promise<WorkflowRun | null> {
    return this.prisma.workflowRun.findFirst({ where: { id: runId, tenantId: this.tenantId } });
  }

  async listForWorkflow(
    workflowId: string,
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<WorkflowRun>> {
    const { cursor, take } = normalizePaginationParams(params);
    const items = await this.prisma.workflowRun.findMany({
      where: { tenantId: this.tenantId, workflowId },
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
}

export function getWorkflowRunRepository(tenantId: string): WorkflowRunRepository {
  return new WorkflowRunRepository(getTenantDb(tenantId), tenantId);
}
