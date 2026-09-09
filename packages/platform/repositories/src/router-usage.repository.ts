import { Prisma, type PrismaClient } from "@nebutra/db";

/**
 * The Router console's read side over `usage_ledger_entries`.
 *
 * **The console never reads the gateway's aggregates** (PRD D1). The gateway
 * keeps its own rollups over `ai_request_logs` for its own product; the Router
 * bills from the ledger, so the Router console must aggregate the same rows it
 * bills from, or the number on the invoice and the number on the dashboard can
 * disagree and both be defensible. There is one source: this file.
 *
 * ## Why raw SQL
 *
 * A charge is attributed to an API key by `metadata->>'keyId'`, and the token
 * breakdown lives in the same JSON object — `quantity` is the *billable*
 * quantity in the price row's unit, which is not the same thing as "prompt
 * tokens". Prisma's `groupBy` cannot group by a JSON path, so the aggregates
 * are SQL. Every one of them is anchored on the `(tenant_id, occurred_at)`
 * index and bounded by a window.
 *
 * ## Windows and buckets are UTC
 *
 * `occurred_at` is a naive timestamp holding UTC, so `date_trunc` on it is
 * already a UTC bucket — no `AT TIME ZONE` conversion, which would silently
 * shift every bucket by the server's offset. The daily spend cap the edge
 * enforces resets at midnight UTC, so the console has to agree with it.
 */

/** Rows written by the Router edge carry this in `metadata.product`. */
const ROUTER_PRODUCT = "router";

export type UsageGranularity = "hour" | "day";

export interface RouterUsageWindow {
  tenantId: string;
  /** Inclusive. */
  from: Date;
  /** Exclusive — so consecutive windows tile without double-counting. */
  to: Date;
}

export interface RouterUsageSummary {
  totalCost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  currency: string;
}

export interface RouterUsageByModel {
  model: string;
  cost: number;
  requests: number;
  promptTokens: number;
  completionTokens: number;
}

export interface RouterUsageByKey {
  keyId: string;
  name: string | null;
  keyPrefix: string | null;
  cost: number;
  requests: number;
}

export interface RouterUsageBucket {
  /** Start of the bucket, UTC. */
  bucket: Date;
  cost: number;
  requests: number;
  tokens: number;
}

export interface RouterUsageRecord {
  id: string;
  occurredAt: Date;
  type: string;
  model: string | null;
  keyId: string | null;
  requestId: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  cacheWriteTokens: number;
  latencyMs: number | null;
  status: number | null;
  quantity: number;
  unit: string;
  unitCost: number | null;
  totalCost: number;
  currency: string;
}

export interface RouterUsageRecordsInput extends RouterUsageWindow {
  model?: string;
  keyId?: string;
  /** HTTP status recorded by the edge. */
  status?: number;
  /** `<occurredAt ISO>|<id>` from the previous page. */
  cursor?: string;
  limit?: number;
}

export interface RouterUsageRecordsResult {
  rows: RouterUsageRecord[];
  nextCursor: string | null;
}

const MAX_PAGE = 500;
const MAX_EXPORT = 10_000;

/** A JSON field read as a number, defensively: a non-number never throws. */
function jsonNumber(key: string): Prisma.Sql {
  return Prisma.sql`CASE WHEN jsonb_typeof(metadata -> ${key}) = 'number'
    THEN (metadata ->> ${key})::numeric ELSE 0 END`;
}

function jsonNumberOrNull(key: string): Prisma.Sql {
  return Prisma.sql`CASE WHEN jsonb_typeof(metadata -> ${key}) = 'number'
    THEN (metadata ->> ${key})::numeric ELSE NULL END`;
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class RouterUsageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private window(w: RouterUsageWindow): Prisma.Sql {
    return Prisma.sql`tenant_id = ${w.tenantId}
      AND occurred_at >= ${w.from}
      AND occurred_at < ${w.to}
      AND metadata ->> 'product' = ${ROUTER_PRODUCT}`;
  }

  async summary(w: RouterUsageWindow): Promise<RouterUsageSummary> {
    const rows = await this.prisma.$queryRaw<
      Array<{ cost: unknown; requests: unknown; prompt: unknown; completion: unknown }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(total_cost), 0) AS cost,
             COUNT(*)::int               AS requests,
             COALESCE(SUM(${jsonNumber("promptTokens")}), 0)     AS prompt,
             COALESCE(SUM(${jsonNumber("completionTokens")}), 0) AS completion
        FROM usage_ledger_entries
       WHERE ${this.window(w)}
    `);
    const row = rows[0];
    const promptTokens = num(row?.prompt);
    const completionTokens = num(row?.completion);
    return {
      totalCost: num(row?.cost),
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      requestCount: num(row?.requests),
      currency: "USD",
    };
  }

  async byModel(w: RouterUsageWindow): Promise<RouterUsageByModel[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        model: string | null;
        cost: unknown;
        requests: unknown;
        prompt: unknown;
        completion: unknown;
      }>
    >(Prisma.sql`
      SELECT resource                    AS model,
             COALESCE(SUM(total_cost), 0) AS cost,
             COUNT(*)::int                AS requests,
             COALESCE(SUM(${jsonNumber("promptTokens")}), 0)     AS prompt,
             COALESCE(SUM(${jsonNumber("completionTokens")}), 0) AS completion
        FROM usage_ledger_entries
       WHERE ${this.window(w)}
       GROUP BY resource
       ORDER BY cost DESC
    `);
    return rows.map((row) => ({
      model: row.model ?? "unknown",
      cost: num(row.cost),
      requests: num(row.requests),
      promptTokens: num(row.prompt),
      completionTokens: num(row.completion),
    }));
  }

  /**
   * Spend per API key. The key id lives in the ledger row's metadata, so the
   * name and prefix are looked up separately — a key that was deleted after it
   * spent still appears, with a null name, because its money was real.
   */
  async byKey(w: RouterUsageWindow): Promise<RouterUsageByKey[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ key_id: string | null; cost: unknown; requests: unknown }>
    >(Prisma.sql`
      SELECT metadata ->> 'keyId'         AS key_id,
             COALESCE(SUM(total_cost), 0) AS cost,
             COUNT(*)::int                AS requests
        FROM usage_ledger_entries
       WHERE ${this.window(w)}
       GROUP BY metadata ->> 'keyId'
       ORDER BY cost DESC
    `);

    const ids = rows.map((row) => row.key_id).filter((id): id is string => Boolean(id));
    const keys = ids.length
      ? await this.prisma.aPIKey.findMany({
          where: { id: { in: ids }, tenantId: w.tenantId },
          select: { id: true, name: true, keyPrefix: true },
        })
      : [];
    const byId = new Map(keys.map((key) => [key.id, key]));

    return rows.map((row) => {
      const key = row.key_id ? byId.get(row.key_id) : undefined;
      return {
        keyId: row.key_id ?? "unknown",
        name: key?.name ?? null,
        keyPrefix: key?.keyPrefix ?? null,
        cost: num(row.cost),
        requests: num(row.requests),
      };
    });
  }

  /**
   * Cost over time, bucketed in UTC. Empty buckets are not invented here — the
   * caller knows the window and the granularity and can fill the gaps, which
   * keeps "no data" distinguishable from "zero spend" at this layer.
   */
  async history(
    w: RouterUsageWindow,
    granularity: UsageGranularity = "day",
  ): Promise<RouterUsageBucket[]> {
    // Interpolated, not parameterised: `date_trunc` takes a literal and the
    // value is one of two constants checked by the type, never user text.
    const unit = granularity === "hour" ? "hour" : "day";
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; cost: unknown; requests: unknown; tokens: unknown }>
    >(Prisma.sql`
      SELECT date_trunc(${unit}, occurred_at) AS bucket,
             COALESCE(SUM(total_cost), 0)     AS cost,
             COUNT(*)::int                    AS requests,
             COALESCE(SUM(${jsonNumber("promptTokens")} + ${jsonNumber("completionTokens")}), 0) AS tokens
        FROM usage_ledger_entries
       WHERE ${this.window(w)}
       GROUP BY 1
       ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      bucket: new Date(row.bucket),
      cost: num(row.cost),
      requests: num(row.requests),
      tokens: num(row.tokens),
    }));
  }

  /** Per-request detail rows, newest first, keyset-paginated. */
  async records(input: RouterUsageRecordsInput): Promise<RouterUsageRecordsResult> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_EXPORT);
    const take = Math.min(limit, MAX_EXPORT) + 1;
    const [cursorTime, cursorId] = (input.cursor ?? "").split("|");
    // Written out rather than as a row comparison `(a, b) < ($1, $2)`: the
    // tuple form leaves the driver to infer both parameter types at once and
    // Postgres rejects it as indeterminate.
    const cursorAt = cursorTime ? new Date(cursorTime) : null;
    const after =
      cursorAt && !Number.isNaN(cursorAt.getTime())
        ? Prisma.sql`AND (occurred_at < ${cursorAt}
             OR (occurred_at = ${cursorAt} AND id < ${cursorId ?? ""}))`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<Record<string, unknown> & { id: string; occurred_at: Date }>
    >(Prisma.sql`
      SELECT id,
             occurred_at,
             type::text AS type,
             resource,
             quantity,
             unit,
             unit_cost,
             COALESCE(total_cost, 0) AS total_cost,
             currency,
             metadata ->> 'keyId'     AS key_id,
             metadata ->> 'requestId' AS request_id,
             ${jsonNumber("promptTokens")}       AS prompt_tokens,
             ${jsonNumber("completionTokens")}   AS completion_tokens,
             ${jsonNumber("cachedPromptTokens")} AS cached_prompt_tokens,
             ${jsonNumber("cacheWriteTokens")}   AS cache_write_tokens,
             ${jsonNumberOrNull("latencyMs")}    AS latency_ms,
             ${jsonNumberOrNull("status")}       AS status
        FROM usage_ledger_entries
       WHERE ${this.window(input)}
         ${input.model ? Prisma.sql`AND resource = ${input.model}` : Prisma.empty}
         ${input.keyId ? Prisma.sql`AND metadata ->> 'keyId' = ${input.keyId}` : Prisma.empty}
         ${
           input.status !== undefined
             ? Prisma.sql`AND ${jsonNumberOrNull("status")} = ${input.status}`
             : Prisma.empty
         }
         ${after}
       ORDER BY occurred_at DESC, id DESC
       LIMIT ${take}
    `);

    const page = rows.slice(0, limit);
    const last = rows.length > limit ? page.at(-1) : null;
    return {
      rows: page.map((row) => ({
        id: row.id,
        occurredAt: new Date(row.occurred_at),
        type: String(row.type ?? "AI_TOKEN"),
        model: (row.resource as string | null) ?? null,
        keyId: (row.key_id as string | null) ?? null,
        requestId: (row.request_id as string | null) ?? null,
        promptTokens: num(row.prompt_tokens),
        completionTokens: num(row.completion_tokens),
        cachedPromptTokens: num(row.cached_prompt_tokens),
        cacheWriteTokens: num(row.cache_write_tokens),
        latencyMs: numOrNull(row.latency_ms),
        status: numOrNull(row.status),
        quantity: num(row.quantity),
        unit: String(row.unit ?? "unit"),
        unitCost: numOrNull(row.unit_cost),
        totalCost: num(row.total_cost),
        currency: String(row.currency ?? "USD"),
      })),
      nextCursor: last ? `${last.occurred_at.toISOString()}|${last.id}` : null,
    };
  }
}

/**
 * Month-to-date in UTC — the console's default window, and the one the daily
 * spend cap is defined against.
 */
export function monthToDateWindow(now: Date = new Date()): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    // Exclusive end, one millisecond past "now" so the current request counts.
    to: new Date(now.getTime() + 1),
  };
}

export { MAX_EXPORT as USAGE_EXPORT_LIMIT, MAX_PAGE as USAGE_PAGE_LIMIT };
