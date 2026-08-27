/**
 * Transport-agnostic JSON-RPC dispatcher for the app-server protocol.
 *
 * Pure and testable: no sockets. WS/SSE/stdio adapters wrap this dispatcher
 * and are intentionally out of scope here.
 *
 * Faithful concurrency model (see `protocol.ts`): requests sharing a
 * `scopeKey` are serialized FIFO; distinct scope keys run concurrently.
 * Because every scope is tenant-prefixed, cross-tenant requests can never
 * share a serial lane (fail-closed multi-tenancy by construction).
 */

import {
  METHOD_REGISTRY,
  type MethodSpec,
  NOTIFICATIONS,
  type NotificationName,
  requestEnvelopeSchema,
  resolveScope,
  type SerializationScope,
  scopeKey,
} from "./protocol";

// ── Public types ─────────────────────────────────────────────────────────────

export type MethodHandler = (params: unknown, scope: SerializationScope) => Promise<unknown>;

export type NotificationListener = (payload: unknown) => void;

interface JsonRpcSuccess {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly result: unknown;
}

interface JsonRpcFailure {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly error: { readonly code: number; readonly message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

// ── JSON-RPC error codes (spec-aligned) ──────────────────────────────────────

const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

function success(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function failure(id: string | number | null, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

const NOTIFICATION_NAMES: ReadonlySet<string> = new Set(NOTIFICATIONS);

const METHOD_SPEC_BY_WIRE: ReadonlyMap<string, MethodSpec> = new Map(
  Object.values(METHOD_REGISTRY).map((spec) => [spec.method, spec]),
);

/** Recover a best-effort id from an unvalidated payload for error responses. */
function extractId(raw: unknown): string | number | null {
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = (raw as { id: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return id;
  }
  return null;
}

export class ProtocolDispatcher {
  readonly #handlers = new Map<string, MethodHandler>();
  readonly #notificationListeners = new Map<NotificationName, Set<NotificationListener>>();
  /** Per-scope-key serial promise chains (tail-of-lane). */
  readonly #lanes = new Map<string, Promise<void>>();

  /** Register a handler for a wire method name (e.g. `"turn/start"`). */
  register(methodName: string, handler: MethodHandler): this {
    this.#handlers.set(methodName, handler);
    return this;
  }

  /** Subscribe to a server→client notification. */
  onNotification(name: NotificationName, listener: NotificationListener): () => void {
    let set = this.#notificationListeners.get(name);
    if (!set) {
      set = new Set();
      this.#notificationListeners.set(name, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  /**
   * Emit a server→client notification. Validates the name against the
   * `NOTIFICATIONS` allow-list (fail-closed: unknown name throws).
   */
  emitNotification(name: NotificationName, payload: unknown): void {
    if (!NOTIFICATION_NAMES.has(name)) {
      throw new Error(`Unknown notification name: ${String(name)}`);
    }
    const listeners = this.#notificationListeners.get(name);
    if (!listeners) return;
    for (const listener of listeners) listener(payload);
  }

  /**
   * Dispatch a single raw envelope. Never throws — every failure path maps
   * to a JSON-RPC error response.
   */
  async dispatch(rawEnvelope: unknown): Promise<JsonRpcResponse> {
    const parsed = requestEnvelopeSchema.safeParse(rawEnvelope);
    if (!parsed.success) {
      return failure(
        extractId(rawEnvelope),
        ERR_INVALID_REQUEST,
        "Invalid request envelope (tenantId is mandatory)",
      );
    }
    const envelope = parsed.data;

    const spec = METHOD_SPEC_BY_WIRE.get(envelope.method);
    if (!spec) {
      return failure(envelope.id, ERR_METHOD_NOT_FOUND, `Method not found: ${envelope.method}`);
    }

    const handler = this.#handlers.get(envelope.method);
    if (!handler) {
      return failure(
        envelope.id,
        ERR_METHOD_NOT_FOUND,
        `No handler registered for method: ${envelope.method}`,
      );
    }

    const params: { threadId?: string } =
      envelope.params && typeof envelope.params === "object"
        ? (envelope.params as { threadId?: string })
        : {};

    let scope: SerializationScope;
    try {
      scope = resolveScope(spec, envelope.tenantId, params);
    } catch {
      return failure(
        envelope.id,
        ERR_INVALID_PARAMS,
        `Method ${envelope.method} requires a threadId for scoping`,
      );
    }

    const key = scopeKey(scope);
    return this.#runSerialized(key, async () => {
      try {
        const result = await handler(envelope.params, scope);
        return success(envelope.id, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal handler error";
        return failure(envelope.id, ERR_INTERNAL, message);
      }
    });
  }

  /**
   * Run `task` after every previously-enqueued task on the same scope key.
   * A failing/slow task never poisons or blocks the lane permanently.
   */
  #runSerialized<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.#lanes.get(key) ?? Promise.resolve();
    const run = previous.then(task, task);
    // Keep the lane's tail; swallow rejections in the chain link so a thrown
    // task does not break FIFO ordering for the next request.
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.#lanes.set(key, tail);
    // Garbage-collect the lane once drained to avoid unbounded key growth.
    void tail.then(() => {
      if (this.#lanes.get(key) === tail) this.#lanes.delete(key);
    });
    return run;
  }
}
