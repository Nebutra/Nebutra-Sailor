import type { PrismaClient } from "@nebutra/db";

/**
 * The per-request log (`ai_request_logs`).
 *
 * One table, two writers: the gateway's completion worker and the Router edge.
 * It is not a ledger — `UsageLedgerEntry` is the money record and outlives this
 * one. This row answers "what happened to request `req_…`": which model, which
 * upstream channel, how long the first byte took, what it cost.
 *
 * ## Retention
 *
 * A log row expires; a ledger row does not. {@link REQUEST_LOG_RETENTION_DAYS}
 * is 30 days because that is one billing cycle: a customer reconciling an
 * invoice can still open the request behind every line on it. A dispute older
 * than the cycle is answered from the ledger, which is kept.
 *
 * `expiresAt` is nullable and the sweep deletes only rows that carry one, so
 * the horizon applies to rows written after it was introduced and never
 * silently eats the gateway's history.
 *
 * ## Privacy
 *
 * Request and response bodies are never stored — a decision, not an omission.
 * When the key has `saveLogs` off, {@link RequestLogRepository.record} still
 * writes the row (the customer is entitled to know a request happened and what
 * it cost) but drops every prompt-derived field: token counts, client IP and
 * the upstream error text.
 */

export const REQUEST_LOG_RETENTION_DAYS = 30;

export function requestLogExpiryFrom(at: Date, days: number = REQUEST_LOG_RETENTION_DAYS): Date {
  return new Date(at.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface RecordRequestLogInput {
  requestId: string;
  tenantId: string;
  apiKeyId?: string | null;
  model: string;
  path?: string | null;
  /** The HTTP status the customer saw. */
  httpStatus?: number | null;
  /** Semantic verdict, matching what the gateway writes. */
  status: string;
  latencyMs?: number | null;
  ttfbMs?: number | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedPromptTokens?: number;
  cacheWriteTokens?: number;
  cost?: number | null;
  supplyPath?: string | null;
  clientIp?: string | null;
  errorMessage?: string | null;
  /** False strips every prompt-derived field before the insert. */
  saveLogs?: boolean;
  now?: Date;
  retentionDays?: number;
}

export interface RequestLogRow {
  requestId: string;
  createdAt: Date;
  path: string | null;
  model: string;
  status: string;
  httpStatus: number | null;
  ttfbMs: number | null;
  latencyMs: number | null;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  cacheWriteTokens: number;
  cost: number | null;
  supplyPath: string | null;
  errorMessage: string | null;
}

export interface ListRequestLogsInput {
  tenantId: string;
  apiKeyId?: string;
  from?: Date;
  to?: Date;
  requestId?: string;
  path?: string;
  /** `createdAt` of the last row of the previous page, ISO. */
  cursor?: string;
  limit?: number;
}

export interface ListRequestLogsResult {
  rows: RequestLogRow[];
  nextCursor: string | null;
}

const MAX_PAGE = 200;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export class RequestLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Write the log line for one finished request.
   *
   * Never throws: a log that cannot be written must not turn a served request
   * into an error, and the money for it is already in the ledger. A duplicate
   * `requestId` (a retried settle) is a no-op by the same rule.
   */
  async record(input: RecordRequestLogInput): Promise<boolean> {
    const now = input.now ?? new Date();
    const detailed = input.saveLogs !== false;
    try {
      await this.prisma.requestLog.create({
        data: {
          requestId: input.requestId,
          tenantId: input.tenantId,
          apiKeyId: input.apiKeyId ?? null,
          model: input.model.slice(0, 128),
          path: input.path ? input.path.slice(0, 120) : null,
          httpStatus: input.httpStatus ?? null,
          status: input.status.slice(0, 16),
          latencyMs: input.latencyMs ?? null,
          ttfbMs: input.ttfbMs ?? null,
          promptTokens: detailed ? (input.promptTokens ?? 0) : 0,
          completionTokens: detailed ? (input.completionTokens ?? 0) : 0,
          totalTokens: detailed ? (input.totalTokens ?? 0) : 0,
          cachedPromptTokens: detailed ? (input.cachedPromptTokens ?? 0) : 0,
          cacheWriteTokens: detailed ? (input.cacheWriteTokens ?? 0) : 0,
          cost: input.cost ?? null,
          supplyPath: input.supplyPath ? input.supplyPath.slice(0, 64) : null,
          clientIp: detailed && input.clientIp ? input.clientIp.slice(0, 64) : null,
          errorMessage: detailed ? (input.errorMessage ?? null) : null,
          expiresAt: requestLogExpiryFrom(now, input.retentionDays),
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Tenant-scoped, newest first, keyset-paginated on `createdAt`. */
  async list(input: ListRequestLogsInput): Promise<ListRequestLogsResult> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE);
    const before = input.cursor ? new Date(input.cursor) : null;
    const rows = await this.prisma.requestLog.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
        ...(input.requestId ? { requestId: input.requestId } : {}),
        ...(input.path ? { path: { contains: input.path } } : {}),
        ...(input.from || input.to || before
          ? {
              createdAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
                ...(before && !Number.isNaN(before.getTime()) ? { lt: before } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        requestId: true,
        createdAt: true,
        path: true,
        model: true,
        status: true,
        httpStatus: true,
        ttfbMs: true,
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        cachedPromptTokens: true,
        cacheWriteTokens: true,
        cost: true,
        supplyPath: true,
        errorMessage: true,
      },
    });

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      rows: page.map((row) => ({ ...row, cost: toNumber(row.cost) })),
      nextCursor: rows.length > limit && last ? last.createdAt.toISOString() : null,
    };
  }

  /**
   * Delete every expired row, bounded. Rows with no horizon are never touched.
   *
   * Prisma has no `DELETE … LIMIT`, so the batch is selected first and deleted
   * by id: a run that overlaps the previous one deletes rows that are already
   * gone, which is a no-op rather than a conflict.
   */
  async purgeExpired(now: Date = new Date(), limit = 500): Promise<number> {
    const doomed = await this.prisma.requestLog.findMany({
      where: { expiresAt: { not: null, lt: now } },
      orderBy: { expiresAt: "asc" },
      take: limit,
      select: { id: true },
    });
    if (doomed.length === 0) return 0;
    const result = await this.prisma.requestLog.deleteMany({
      where: { id: { in: doomed.map((row) => row.id) } },
    });
    return result.count;
  }
}
