/**
 * Runtime-agnostic SSE / HTTP transport binding for `ProtocolDispatcher`.
 *
 * Built on Web-standard primitives ONLY — `Request`, `Response`,
 * `ReadableStream`, `TextEncoder`, `AbortSignal`. There is no Hono / Express /
 * `node:http` dependency, so the same code runs unchanged on edge runtimes,
 * Cloudflare Workers, Deno, Bun, and Node (>=18, where these globals exist).
 *
 * Design goals:
 *  - Pure functions returning Web objects; nothing is mutated in place.
 *  - The dispatcher already fails closed on a missing `tenantId` (its
 *    `requestEnvelopeSchema` makes `tenantId` mandatory). This binding does
 *    not re-implement that policy — it faithfully relays the JSON-RPC error.
 *  - Never throw across the transport boundary and never leak a stack trace:
 *    a malformed body becomes a well-formed JSON-RPC parse error.
 *
 * Wire framing (SSE): each event is emitted as
 *   `event: <ThreadEvent.type>\n` + `data: <JSON(event)>\n\n`
 */

import type { NotificationName, ProtocolDispatcher, ThreadEvent } from "@nebutra/agent-runtime";

// ── JSON-RPC constants ───────────────────────────────────────────────────────

/** Spec code for "Parse error" — the request body was not valid JSON. */
const ERR_PARSE = -32700;

const JSON_HEADERS: Readonly<Record<string, string>> = {
  "content-type": "application/json; charset=utf-8",
};

/** A self-contained JSON-RPC failure envelope (used only for parse errors;
 *  every other failure path is produced by the dispatcher itself). */
function parseErrorEnvelope(message: string): {
  readonly jsonrpc: "2.0";
  readonly id: null;
  readonly error: { readonly code: number; readonly message: string };
} {
  return { jsonrpc: "2.0", id: null, error: { code: ERR_PARSE, message } };
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS } });
}

// ── HTTP / JSON-RPC handler ──────────────────────────────────────────────────

/**
 * Build a Web-standard request handler bound to a dispatcher.
 *
 * Contract:
 *  - Unparseable body → `400` with a JSON-RPC parse-error envelope.
 *  - Any parseable body (incl. missing tenant / unknown method / handler
 *    failure) → `200` with the dispatcher's own JSON-RPC envelope. The HTTP
 *    layer stays `200` for business-level JSON-RPC errors per JSON-RPC-over-
 *    HTTP convention; the error lives in the envelope, not the status line.
 *  - The returned function never throws and never emits a 500-with-stack.
 */
export function createRpcHandler(
  dispatcher: ProtocolDispatcher,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonResponse(parseErrorEnvelope("Request body is not valid JSON"), 400);
    }

    // `dispatch` is documented to never throw; the try/catch is defence in
    // depth so the transport boundary is total under any future change.
    try {
      const envelope = await dispatcher.dispatch(raw);
      return jsonResponse(envelope, 200);
    } catch {
      return jsonResponse(parseErrorEnvelope("Dispatcher failure"), 400);
    }
  };
}

// ── SSE streaming ────────────────────────────────────────────────────────────

export interface SseOptions {
  /** Cancels the stream cleanly; closing the consumer also cancels it. */
  readonly signal?: AbortSignal;
}

/** Encode one `ThreadEvent` as a single SSE frame. */
function frame(event: ThreadEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Encode a terminal transport-level error as an `event: error` SSE frame. */
function errorFrame(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ type: "error", message })}\n\n`;
}

/**
 * Adapt an async `ThreadEvent` stream into a Web-standard
 * `text/event-stream` `Response`.
 *
 * Guarantees:
 *  - Incremental flush: each event is enqueued as soon as it is produced.
 *  - Clean termination: the stream closes when the iterable is exhausted.
 *  - Error surfacing: an iterable error is emitted as a final
 *    `event: error` frame, then the stream closes (it never hangs).
 *  - Cancellation: an aborted `signal` (or a cancelled reader) stops
 *    pulling from the source and releases its iterator.
 */
export function sseResponse(stream: AsyncIterable<ThreadEvent>, opts?: SseOptions): Response {
  const encoder = new TextEncoder();
  const signal = opts?.signal;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const iterator = stream[Symbol.asyncIterator]();

      const onAbort = () => {
        void iterator.return?.(undefined);
      };
      if (signal) {
        if (signal.aborted) {
          await iterator.return?.(undefined);
          controller.close();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }

      try {
        for (;;) {
          if (signal?.aborted) break;
          const next = await iterator.next();
          if (next.done) break;
          controller.enqueue(encoder.encode(frame(next.value)));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream error";
        controller.enqueue(encoder.encode(errorFrame(message)));
      } finally {
        signal?.removeEventListener("abort", onAbort);
        controller.close();
      }
    },
    cancel() {
      // Consumer hung up: best-effort release of the upstream iterator.
      void stream[Symbol.asyncIterator]().return?.(undefined);
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

// ── Notification → async-iterable bridge ─────────────────────────────────────

export interface NotificationFrame {
  readonly name: NotificationName;
  readonly payload: unknown;
}

/**
 * Bridge `dispatcher.onNotification` (a push listener API) into a pull-based
 * `AsyncIterable`. A bounded backlog buffers events that arrive between
 * `next()` calls; pending readers are resolved immediately when an event
 * arrives. Calling `return()` (or breaking a `for await`) unsubscribes every
 * underlying listener — no leaks, fail-closed teardown.
 */
export function subscribeNotifications(
  dispatcher: ProtocolDispatcher,
  names: readonly NotificationName[],
): AsyncIterable<NotificationFrame> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<NotificationFrame> {
      const backlog: NotificationFrame[] = [];
      const waiters: Array<(r: IteratorResult<NotificationFrame>) => void> = [];
      let closed = false;

      const unsubscribers = names.map((name) =>
        dispatcher.onNotification(name, (payload) => {
          if (closed) return;
          const value: NotificationFrame = { name, payload };
          const waiter = waiters.shift();
          if (waiter) waiter({ value, done: false });
          else backlog.push(value);
        }),
      );

      const teardown = (): void => {
        if (closed) return;
        closed = true;
        for (const off of unsubscribers) off();
        let waiter = waiters.shift();
        while (waiter) {
          waiter({ value: undefined, done: true });
          waiter = waiters.shift();
        }
      };

      return {
        next(): Promise<IteratorResult<NotificationFrame>> {
          const buffered = backlog.shift();
          if (buffered) return Promise.resolve({ value: buffered, done: false });
          if (closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise((resolve) => waiters.push(resolve));
        },
        return(): Promise<IteratorResult<NotificationFrame>> {
          teardown();
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}
