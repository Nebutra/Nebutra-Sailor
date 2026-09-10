import type {
  ParaApproval,
  ParaApprovalStatus,
  ParaAutonomy,
  ParaRun,
  ParaRunStatus,
  ParaThread,
  PrismaClient,
} from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";

/**
 * PARA agent state: threads, runs and approvals. All of it is server-owned — a run advances in a
 * worker, so no transition here depends on a browser being connected. The turn trace itself is not
 * stored here; `agent_rollout_lines` (@nebutra/agent-runtime) already holds it keyed by
 * (tenantId, threadId). Construct tenant-scoped via `getParaAgentRepository(tenantId)`.
 */

export interface CreateRunData {
  threadId: string;
  workspaceId: string;
  input: string;
  contextNodeIds?: string[];
}

export interface RunWithThread extends ParaRun {
  thread: ParaThread;
}

/** A resolution that lost a race — the approval was already decided by someone else. */
export class ApprovalAlreadyDecidedError extends Error {
  constructor(public readonly approvalId: string) {
    super(`approval ${approvalId} has already been decided`);
    this.name = "ApprovalAlreadyDecidedError";
  }
}

export class ParaAgentRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  // ── Threads ─────────────────────────────────────────────────────────────────

  listThreads(projectId: string, limit = 50): Promise<ParaThread[]> {
    return this.prisma.paraThread.findMany({
      where: { tenantId: this.tenantId, projectId },
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  findThread(id: string): Promise<ParaThread | null> {
    return this.prisma.paraThread.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  /** Auto-titled from the first prompt, the way every competitor names a thread. */
  createThread(projectId: string, title: string): Promise<ParaThread> {
    const trimmed = title.trim().replace(/\s+/g, " ").slice(0, 200);
    return this.prisma.paraThread.create({
      data: { tenantId: this.tenantId, projectId, title: trimmed || "New thread" },
    });
  }

  async setAutonomy(id: string, autonomy: ParaAutonomy): Promise<ParaThread | null> {
    const count = await this.prisma.paraThread
      .updateMany({ where: { id, tenantId: this.tenantId }, data: { autonomy } })
      .then((r) => r.count);
    return count === 1 ? this.findThread(id) : null;
  }

  // ── Runs ────────────────────────────────────────────────────────────────────

  createRun(data: CreateRunData): Promise<ParaRun> {
    return this.prisma.paraRun.create({
      data: {
        tenantId: this.tenantId,
        threadId: data.threadId,
        workspaceId: data.workspaceId,
        input: data.input,
        contextNodeIds: data.contextNodeIds ?? [],
      },
    });
  }

  findRun(id: string): Promise<ParaRun | null> {
    return this.prisma.paraRun.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  /** The runner needs the thread in the same read: autonomy decides whether spending is gated. */
  findRunWithThread(id: string): Promise<RunWithThread | null> {
    return this.prisma.paraRun.findFirst({
      where: { id, tenantId: this.tenantId },
      include: { thread: true },
    }) as Promise<RunWithThread | null>;
  }

  listRuns(threadId: string, limit = 50): Promise<ParaRun[]> {
    return this.prisma.paraRun.findMany({
      where: { tenantId: this.tenantId, threadId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Claim a run for execution. Only a QUEUED run can start, so a redelivered event cannot run the
   * same turn twice; the caller treats `null` as "someone else has it".
   */
  async startRun(id: string): Promise<ParaRun | null> {
    const count = await this.prisma.paraRun
      .updateMany({
        where: { id, tenantId: this.tenantId, status: "QUEUED" },
        data: { status: "RUNNING", startedAt: new Date() },
      })
      .then((r) => r.count);
    return count === 1 ? this.findRun(id) : null;
  }

  parkRun(id: string): Promise<number> {
    return this.prisma.paraRun
      .updateMany({
        where: { id, tenantId: this.tenantId, status: "RUNNING" },
        data: { status: "AWAITING_APPROVAL" },
      })
      .then((r) => r.count);
  }

  /** Move a parked run back to QUEUED so the resume event can claim it through `startRun`. */
  requeueRun(id: string): Promise<number> {
    return this.prisma.paraRun
      .updateMany({
        where: { id, tenantId: this.tenantId, status: "AWAITING_APPROVAL" },
        data: { status: "QUEUED" },
      })
      .then((r) => r.count);
  }

  finishRun(
    id: string,
    status: Extract<ParaRunStatus, "COMPLETED" | "FAILED">,
    error?: { code: string; message: string },
  ): Promise<number> {
    return this.prisma.paraRun
      .updateMany({
        where: { id, tenantId: this.tenantId },
        data: {
          status,
          finishedAt: new Date(),
          ...(error ? { error } : {}),
        },
      })
      .then((r) => r.count);
  }

  // ── Approvals ───────────────────────────────────────────────────────────────

  createApproval(data: {
    runId: string;
    toolName: string;
    args: Record<string, unknown>;
    estimatedCost: number;
  }): Promise<ParaApproval> {
    return this.prisma.paraApproval.create({
      data: {
        tenantId: this.tenantId,
        runId: data.runId,
        toolName: data.toolName,
        args: data.args as object,
        estimatedCost: data.estimatedCost,
      },
    });
  }

  findApproval(id: string): Promise<ParaApproval | null> {
    return this.prisma.paraApproval.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  listPendingApprovals(runId: string): Promise<ParaApproval[]> {
    return this.prisma.paraApproval.findMany({
      where: { tenantId: this.tenantId, runId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Decide a pending approval. Conditional on PENDING so two clicks cannot spend twice; the loser
   * gets ApprovalAlreadyDecidedError rather than a second job.
   */
  async decideApproval(
    id: string,
    status: Extract<ParaApprovalStatus, "APPROVED" | "DENIED">,
    decidedBy: string,
  ): Promise<ParaApproval> {
    const count = await this.prisma.paraApproval
      .updateMany({
        where: { id, tenantId: this.tenantId, status: "PENDING" },
        data: { status, decidedBy, decidedAt: new Date() },
      })
      .then((r) => r.count);
    if (count !== 1) throw new ApprovalAlreadyDecidedError(id);
    const decided = await this.findApproval(id);
    if (!decided) throw new Error(`approval ${id} vanished after decision`);
    return decided;
  }

  attachApprovalResult(id: string, jobId: string): Promise<number> {
    return this.prisma.paraApproval
      .updateMany({ where: { id, tenantId: this.tenantId }, data: { resultJobId: jobId } })
      .then((r) => r.count);
  }
}

export function getParaAgentRepository(tenantId: string): ParaAgentRepository {
  return new ParaAgentRepository(getTenantDb(tenantId), tenantId);
}
