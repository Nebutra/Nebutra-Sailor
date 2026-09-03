import { Prisma, type PrismaClient, type WebhookEvent } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

/**
 * A recursive JSON-compatible value type.
 * Exported for consumers that need to type webhook payloads passed to this repository.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface UpsertWebhookEventData {
  provider: string;
  eventId: string;
  eventType: string;
  payload: JsonValue;
}

export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<WebhookEvent[]> {
    return this.prisma.webhookEvent.findMany();
  }

  async findPaginated(
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<WebhookEvent>> {
    const { cursor, take } = normalizePaginationParams(params);

    type FindArgs = Parameters<typeof this.prisma.webhookEvent.findMany>[0];
    const query: FindArgs = {
      take: take + 1,
      orderBy: { createdAt: "desc" },
    };
    if (cursor != null) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }
    const items = await this.prisma.webhookEvent.findMany(query);

    const hasNextPage = items.length > take;
    if (hasNextPage) items.pop();

    return {
      items,
      nextCursor: hasNextPage ? (items[items.length - 1]?.id ?? null) : null,
      hasNextPage,
    };
  }

  async findById(id: string): Promise<WebhookEvent | null> {
    return this.prisma.webhookEvent.findUnique({ where: { id } });
  }

  async findByProviderAndEventId(provider: string, eventId: string): Promise<WebhookEvent | null> {
    return this.prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: { provider, eventId },
      },
    });
  }

  /**
   * Atomically claim a webhook event for processing.
   *
   * Returns `{ claimed: true, event }` when this caller was the first to
   * insert the `(provider, eventId)` row, or `{ claimed: false }` when a
   * concurrent delivery already inserted it. Relies on the unique
   * constraint `@@unique([provider, eventId])` on WebhookEvent — a
   * P2002 violation signals "already received" and is handled as a
   * non-error outcome.
   *
   * Use this in webhook handlers instead of check-then-act (findUnique
   * + upsert) to eliminate the race between concurrent retries.
   */
  async claim(
    data: UpsertWebhookEventData,
  ): Promise<{ claimed: true; event: WebhookEvent } | { claimed: false }> {
    const { provider, eventId, eventType, payload } = data;

    try {
      const event = await this.prisma.webhookEvent.create({
        data: {
          provider,
          eventId,
          eventType,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      return { claimed: true, event };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { claimed: false };
      }
      throw err;
    }
  }

  /**
   * Atomically re-lease an existing, retryable inbox row.
   *
   * The row's `createdAt` is the lease timestamp: a recent row with no
   * `errorMessage` is held by an in-flight worker. A row is retryable when
   * it is not processed AND (a previous attempt recorded an error OR the
   * lease is older than `inFlightMs`, i.e. the holder crashed).
   *
   * This is one UPDATE whose WHERE encodes that predicate and whose SET
   * re-stamps the lease (`createdAt = now`, `errorMessage = null`). Under
   * READ COMMITTED a concurrent retrier blocks on the row lock, re-evaluates
   * the WHERE against the re-stamped row, and updates 0 rows — so of N
   * concurrent retries exactly one wins. Compare {@link claim}, which is the
   * same idea for the first delivery via the unique constraint.
   *
   * Returns the re-leased row, or `null` when the lease was lost (another
   * retrier won, or the row was processed meanwhile).
   */
  async lease(
    provider: string,
    eventId: string,
    now: Date,
    inFlightMs: number,
  ): Promise<WebhookEvent | null> {
    const { count } = await this.prisma.webhookEvent.updateMany({
      where: {
        provider,
        eventId,
        processedAt: null,
        OR: [
          { errorMessage: { not: null } },
          { createdAt: { lt: new Date(now.getTime() - inFlightMs) } },
        ],
      },
      data: {
        createdAt: now,
        errorMessage: null,
      },
    });
    if (count === 0) {
      return null;
    }
    return this.findByProviderAndEventId(provider, eventId);
  }

  /**
   * Insert or update a webhook event record.
   *
   * On conflict (same provider + eventId), the payload and eventType are
   * updated but processedAt is left untouched so we don't accidentally
   * clear a previously-processed marker.
   *
   * @deprecated Use {@link claim} for idempotent event capture to avoid
   * the check-then-act race present in `findUnique` + `upsert`.
   */
  async upsert(data: UpsertWebhookEventData): Promise<WebhookEvent> {
    const { provider, eventId, eventType, payload } = data;

    return this.prisma.webhookEvent.upsert({
      where: {
        provider_eventId: { provider, eventId },
      },
      create: {
        provider,
        eventId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Mark an event as successfully processed by setting `processedAt` to now.
   */
  async markProcessed(provider: string, eventId: string): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.update({
      where: {
        provider_eventId: { provider, eventId },
      },
      data: {
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark an event as failed by recording the error message and incrementing the retry count.
   */
  async markFailed(provider: string, eventId: string, errorMessage: string): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.update({
      where: {
        provider_eventId: { provider, eventId },
      },
      data: {
        errorMessage,
        retryCount: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhookEvent.delete({ where: { id } });
  }
}
