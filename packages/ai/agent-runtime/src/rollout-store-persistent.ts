/**
 * Production-grade, tenant-scoped {@link RolloutStore} backed by an injectable
 * persistence port. This package depends on NO datastore: a Postgres /
 * ClickHouse / `@nebutra/db` / `@nebutra/audit` adapter satisfies
 * {@link RolloutPersistencePort} from the outside, so the "no infra change"
 * promise stays honest — swap the adapter, keep the interface.
 *
 * Tenancy is structural: `tenantId` is part of the storage key AND Zod-validated
 * on every read and write. Cross-tenant access is impossible by construction.
 * The store fails closed — empty identifiers and malformed stored payloads
 * raise typed errors; records are never silently dropped.
 */

import { z } from "zod";
import type { RolloutLine, RolloutStore } from "./rollout";

/**
 * Minimal append-only persistence seam. Implementations MUST persist records
 * durably and return them ascending by `seq` for a given (tenant, thread).
 */
export interface RolloutPersistencePort {
  put(record: {
    tenantId: string;
    threadId: string;
    seq: number;
    at: string;
    payload: string;
  }): Promise<void>;
  /** Records for one (tenant, thread), ascending by seq. */
  list(tenantId: string, threadId: string): Promise<{ seq: number; payload: string }[]>;
}

/** Raised when a stored payload cannot be faithfully reconstructed. */
export class RoundTripError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RoundTripError";
  }
}

const tenantId = z.string().min(1, "tenantId is required");
const threadId = z.string().min(1, "threadId is required");
const at = z.string().min(1);

const turnConfigSchema = z.object({
  model: z.string(),
  provider: z.string(),
  approvalPolicy: z.string(),
  capabilityPolicy: z.string(),
  reasoningEffort: z.enum(["low", "medium", "high"]).optional(),
});

const threadEventSchema = z.custom<RolloutLine extends { event: infer E } ? E : never>(
  (v) => typeof v === "object" && v !== null && typeof (v as { type?: unknown }).type === "string",
  { message: "invalid ThreadEvent" },
);

const rolloutLineSchema: z.ZodType<RolloutLine> = z.discriminatedUnion("type", [
  z.object({
    tenantId,
    threadId,
    type: z.literal("session_meta"),
    config: turnConfigSchema,
    at,
  }),
  z.object({
    tenantId,
    threadId,
    type: z.literal("event"),
    event: threadEventSchema,
    at,
  }),
  z.object({
    tenantId,
    threadId,
    type: z.literal("turn_context"),
    config: turnConfigSchema,
    at,
  }),
  z.object({
    tenantId,
    threadId,
    type: z.literal("compacted"),
    summary: z.string(),
    droppedThrough: z.string(),
    at,
  }),
]) as z.ZodType<RolloutLine>;

const tenantThreadSchema = z.object({ tenantId, threadId });

export class PersistentRolloutStore implements RolloutStore {
  readonly #port: RolloutPersistencePort;
  /**
   * Per-(tenant,thread) seq allocation chained through a promise so concurrent
   * `append` calls to the same thread serialize and never collide on seq —
   * without blocking appends to other threads.
   */
  readonly #tails = new Map<string, Promise<number>>();

  constructor(port: RolloutPersistencePort) {
    this.#port = port;
  }

  #key(t: string, th: string): string {
    return `${t}::${th}`;
  }

  async append(line: RolloutLine): Promise<void> {
    const validated = rolloutLineSchema.parse(line);
    const key = this.#key(validated.tenantId, validated.threadId);

    const prev = this.#tails.get(key) ?? Promise.resolve(-1);
    const next = prev.then(async (last) => {
      const seq = last + 1;
      await this.#port.put({
        tenantId: validated.tenantId,
        threadId: validated.threadId,
        seq,
        at: validated.at,
        payload: JSON.stringify(validated),
      });
      return seq;
    });
    // Keep the chain advancing even if a put fails (fail-closed for the caller,
    // but the next append must not deadlock on a rejected tail).
    this.#tails.set(
      key,
      next.catch(() => (this.#tails.get(key) === next ? -1 : next)),
    );
    await next;
  }

  async read(tenantIdArg: string, threadIdArg: string): Promise<readonly RolloutLine[]> {
    const { tenantId: t, threadId: th } = tenantThreadSchema.parse({
      tenantId: tenantIdArg,
      threadId: threadIdArg,
    });

    const records = await this.#port.list(t, th);
    const ordered = [...records].sort((a, b) => a.seq - b.seq);

    return ordered.map((r) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(r.payload);
      } catch (cause) {
        throw new RoundTripError(`malformed stored payload at seq ${r.seq} for ${t}::${th}`, {
          cause,
        });
      }
      const result = rolloutLineSchema.safeParse(parsed);
      if (!result.success) {
        throw new RoundTripError(
          `structurally-invalid stored payload at seq ${r.seq} for ${t}::${th}`,
          { cause: result.error },
        );
      }
      const reconstructed = result.data;
      if (reconstructed.tenantId !== t || reconstructed.threadId !== th) {
        throw new RoundTripError(`tenant/thread mismatch at seq ${r.seq} for ${t}::${th}`);
      }
      return reconstructed;
    });
  }
}
