/**
 * Event-sourced rollout / session trace (WRAP — capability #7).
 *
 * Faithful re-expression of the upstream rollout model: an append-only typed
 * event log, state derived by replay, a first-class context-compaction marker
 * (so replay stays bounded), and a per-item persistence policy that sanitizes
 * and size-caps outputs before they are durable.
 *
 * Multi-tenant adaptation: every rollout line carries `tenantId`; the store
 * interface is tenant-scoped so a Postgres/ClickHouse-backed implementation
 * (via `@nebutra/audit` providers / `@nebutra/db`) replaces the upstream
 * single-host jsonl + embedded-SQLite assumptions. Only an in-memory
 * reference store ships here.
 */

import type { ThreadEvent, ThreadItem, TurnConfig } from "./model";

/** Cap mirrors the upstream persisted-output ceiling. */
export const PERSISTED_OUTPUT_MAX_BYTES = 10_000;

export type EventPersistenceMode = "limited" | "extended";

/** One durable line in a thread's append-only log. */
export type RolloutLine =
  | {
      readonly tenantId: string;
      readonly threadId: string;
      readonly type: "session_meta";
      readonly config: TurnConfig;
      readonly at: string;
    }
  | {
      readonly tenantId: string;
      readonly threadId: string;
      readonly type: "event";
      readonly event: ThreadEvent;
      readonly at: string;
    }
  | {
      readonly tenantId: string;
      readonly threadId: string;
      readonly type: "turn_context";
      readonly config: TurnConfig;
      readonly at: string;
    }
  | {
      readonly tenantId: string;
      readonly threadId: string;
      readonly type: "compacted";
      readonly summary: string;
      readonly droppedThrough: string;
      readonly at: string;
    };

/**
 * Persistence policy: decide per item whether it is durable, and sanitize +
 * size-cap its output first. Executive markers are always persisted.
 */
export function isPersisted(item: ThreadItem, mode: EventPersistenceMode): boolean {
  if (item.type === "reasoning") return mode === "extended";
  return true;
}

/** Truncate aggregated command output to the persisted ceiling. */
export function sanitizeForPersist(item: ThreadItem): ThreadItem {
  if (item.type !== "command_execution") return item;
  const bytes = Buffer.byteLength(item.aggregatedOutput, "utf8");
  if (bytes <= PERSISTED_OUTPUT_MAX_BYTES) return item;
  const truncated = Buffer.from(item.aggregatedOutput, "utf8")
    .subarray(0, PERSISTED_OUTPUT_MAX_BYTES)
    .toString("utf8");
  return { ...item, aggregatedOutput: `${truncated}\n…[truncated]` };
}

/** Tenant-scoped append-only store. Replace the impl, keep the interface. */
export interface RolloutStore {
  append(line: RolloutLine): Promise<void>;
  /** Lines for a thread, in append order. */
  read(tenantId: string, threadId: string): Promise<readonly RolloutLine[]>;
}

/** In-memory reference store (dev/test only — never multi-instance safe). */
export class InMemoryRolloutStore implements RolloutStore {
  readonly #lines = new Map<string, RolloutLine[]>();

  #key(tenantId: string, threadId: string): string {
    return `${tenantId}::${threadId}`;
  }

  async append(line: RolloutLine): Promise<void> {
    const key = this.#key(line.tenantId, line.threadId);
    const list = this.#lines.get(key) ?? [];
    list.push(line);
    this.#lines.set(key, list);
  }

  async read(tenantId: string, threadId: string): Promise<readonly RolloutLine[]> {
    return [...(this.#lines.get(this.#key(tenantId, threadId)) ?? [])];
  }
}

/** Derived thread state — the projection rebuilt by replaying the log. */
export interface ThreadProjection {
  readonly tenantId: string;
  readonly threadId: string;
  config?: TurnConfig;
  readonly items: ThreadItem[];
  /** Marks where a compaction summary replaced earlier history. */
  compactionSummary?: string;
}

/**
 * Replay an append-only log into derived state. A `compacted` line bounds
 * replay: items prior to it are represented by the summary, not re-applied.
 */
export function replay(lines: readonly RolloutLine[]): ThreadProjection | null {
  const first = lines[0];
  if (!first) return null;
  const projection: ThreadProjection = {
    tenantId: first.tenantId,
    threadId: first.threadId,
    items: [],
  };
  for (const line of lines) {
    switch (line.type) {
      case "session_meta":
      case "turn_context":
        projection.config = line.config;
        break;
      case "compacted":
        projection.compactionSummary = line.summary;
        projection.items.length = 0;
        break;
      case "event": {
        const e = line.event;
        if (e.type === "item.completed" || e.type === "item.started") {
          const idx = projection.items.findIndex((i) => i.id === e.item.id);
          if (idx >= 0) projection.items[idx] = e.item;
          else projection.items.push(e.item);
        } else if (e.type === "item.updated") {
          const idx = projection.items.findIndex((i) => i.id === e.item.id);
          if (idx >= 0) projection.items[idx] = e.item;
          else projection.items.push(e.item);
        }
        break;
      }
    }
  }
  return projection;
}
