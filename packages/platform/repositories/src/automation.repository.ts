import type {
  Automation,
  AutomationScheduleKind,
  AutomationStatus,
  PrismaClient,
  ReasoningEffort,
} from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface CreateAutomationData {
  name: string;
  prompt: string;
  scheduleExpr: string;
  scheduleKind?: AutomationScheduleKind;
  timezone?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  scopeRef?: string | null;
  knownIssues?: string[];
  status?: AutomationStatus;
  nextRunAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateAutomationData {
  name?: string;
  prompt?: string;
  scheduleExpr?: string;
  scheduleKind?: AutomationScheduleKind;
  timezone?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  scopeRef?: string | null;
  knownIssues?: string[];
  status?: AutomationStatus;
  nextRunAt?: Date | null;
}

/**
 * Repository seam for tenant-owned agent automations. Construct with a
 * tenant-scoped client (`getAutomationRepository(tenantId)`); RLS is applied
 * transparently. Routes / agent tools / the runner go through this — never raw
 * Prisma.
 */
export class AutomationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async findPaginated(
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<Automation>> {
    const { cursor, take } = normalizePaginationParams(params);
    const items = await this.prisma.automation.findMany({
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

  async list(): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Automation | null> {
    return this.prisma.automation.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  async create(data: CreateAutomationData): Promise<Automation> {
    return this.prisma.automation.create({
      data: {
        tenantId: this.tenantId,
        name: data.name,
        prompt: data.prompt,
        scheduleExpr: data.scheduleExpr,
        ...(data.scheduleKind ? { scheduleKind: data.scheduleKind } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(data.model ? { model: data.model } : {}),
        ...(data.reasoningEffort ? { reasoningEffort: data.reasoningEffort } : {}),
        ...(data.scopeRef !== undefined ? { scopeRef: data.scopeRef } : {}),
        ...(data.knownIssues ? { knownIssues: data.knownIssues } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.nextRunAt !== undefined ? { nextRunAt: data.nextRunAt } : {}),
        ...(data.metadata ? { metadata: data.metadata as object } : {}),
      },
    });
  }

  async update(id: string, data: UpdateAutomationData): Promise<Automation> {
    return this.prisma.automation.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.prompt !== undefined ? { prompt: data.prompt } : {}),
        ...(data.scheduleExpr !== undefined ? { scheduleExpr: data.scheduleExpr } : {}),
        ...(data.scheduleKind !== undefined ? { scheduleKind: data.scheduleKind } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.reasoningEffort !== undefined ? { reasoningEffort: data.reasoningEffort } : {}),
        ...(data.scopeRef !== undefined ? { scopeRef: data.scopeRef } : {}),
        ...(data.knownIssues !== undefined ? { knownIssues: data.knownIssues } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.nextRunAt !== undefined ? { nextRunAt: data.nextRunAt } : {}),
      },
    });
  }

  async setStatus(id: string, status: AutomationStatus): Promise<Automation> {
    return this.prisma.automation.update({ where: { id }, data: { status } });
  }

  /** Record that a scheduled run fired; advance the next fire time. */
  async touchRun(id: string, nextRunAt: Date | null): Promise<void> {
    await this.prisma.automation.update({
      where: { id },
      data: { lastRunAt: new Date(), nextRunAt },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.automation.delete({ where: { id } });
  }
}

export function getAutomationRepository(tenantId: string): AutomationRepository {
  return new AutomationRepository(getTenantDb(tenantId), tenantId);
}

/**
 * Cross-tenant due-automation query for the scheduler. Pass a SYSTEM-scoped
 * client (`getSystemDb()`); the caller (Inngest scheduler) owns the
 * AUDIT(no-tenant) justification. Returns ACTIVE automations whose nextRunAt is
 * due (or unset), capped, so the heartbeat can fan out per-tenant run events.
 */
export async function findDueAutomations(
  systemDb: PrismaClient,
  now: Date,
  limit: number,
): Promise<Automation[]> {
  return systemDb.automation.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });
}
