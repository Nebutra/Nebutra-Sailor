import type { AutomationRun, AutomationRunStatus, PrismaClient } from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface StartRunData {
  automationId: string;
  threadId: string;
  idempotencyKey: string;
  scheduledAt?: Date | null;
  triggeredBy?: string;
}

export interface FinishRunData {
  status: AutomationRunStatus;
  summary?: string | null;
  changedFiles?: string[];
  blockers?: string[];
  verifications?: Array<{ command: string; result: string }>;
  tokenUsage?: Record<string, unknown>;
  memorySnapshot?: Record<string, unknown>;
}

/** Read-back context prepended to the agent prompt before each run (memory.md). */
export interface MemoryContext {
  knownIssues: string[];
  lastOutcome: AutomationRunStatus | null;
  recentRuns: Array<{
    status: AutomationRunStatus;
    summary: string | null;
    finishedAt: Date | null;
  }>;
}

const SUMMARY_MAX = 4000;

/**
 * Append-only run log for agent automations. Construct with a tenant-scoped
 * client (`getAutomationRunRepository(tenantId)`). Only status/result fields are
 * mutated after the initial RUNNING insert (append-only by policy).
 */
export class AutomationRunRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  /**
   * Create the RUNNING row. Idempotent: a duplicate (tenantId, idempotencyKey)
   * — e.g. an Inngest retry — returns the existing row instead of throwing.
   */
  async start(data: StartRunData): Promise<AutomationRun> {
    try {
      return await this.prisma.automationRun.create({
        data: {
          tenantId: this.tenantId,
          automationId: data.automationId,
          threadId: data.threadId,
          idempotencyKey: data.idempotencyKey,
          status: "RUNNING",
          ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
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
        const existing = await this.prisma.automationRun.findUnique({
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

  async finish(runId: string, data: FinishRunData): Promise<AutomationRun> {
    return this.prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: data.status,
        finishedAt: new Date(),
        ...(data.summary !== undefined
          ? { summary: data.summary?.slice(0, SUMMARY_MAX) ?? null }
          : {}),
        ...(data.changedFiles ? { changedFiles: data.changedFiles } : {}),
        ...(data.blockers ? { blockers: data.blockers } : {}),
        ...(data.verifications ? { verifications: data.verifications as object } : {}),
        ...(data.tokenUsage ? { tokenUsage: data.tokenUsage as object } : {}),
        ...(data.memorySnapshot ? { memorySnapshot: data.memorySnapshot as object } : {}),
      },
    });
  }

  async listForAutomation(
    automationId: string,
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<AutomationRun>> {
    const { cursor, take } = normalizePaginationParams(params);
    const items = await this.prisma.automationRun.findMany({
      where: { tenantId: this.tenantId, automationId },
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

  async getLastRun(automationId: string): Promise<AutomationRun | null> {
    return this.prisma.automationRun.findFirst({
      where: { tenantId: this.tenantId, automationId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Build the read-back context for the next run from the last `n` runs. */
  async loadMemoryContext(
    automationId: string,
    knownIssues: string[],
    n = 5,
  ): Promise<MemoryContext> {
    const recent = await this.prisma.automationRun.findMany({
      where: { tenantId: this.tenantId, automationId },
      orderBy: { createdAt: "desc" },
      take: n,
      select: { status: true, summary: true, finishedAt: true },
    });
    return {
      knownIssues,
      lastOutcome: recent[0]?.status ?? null,
      recentRuns: recent,
    };
  }
}

export function getAutomationRunRepository(tenantId: string): AutomationRunRepository {
  return new AutomationRunRepository(getTenantDb(tenantId), tenantId);
}
