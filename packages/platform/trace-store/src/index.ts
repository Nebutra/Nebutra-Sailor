import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityError } from "@nebutra/errors";

export type NebuSpanKind = "agent" | "tool" | "llm";

export interface NebuSpanRecord {
  readonly id: string;
  readonly traceId: string;
  readonly kind: NebuSpanKind;
  readonly name: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly durationMs?: number;
  readonly attributes?: Record<string, unknown>;
  readonly status: "started" | "ended" | "failed";
}

export type TraceExporter = (batch: readonly NebuSpanRecord[]) => Promise<void>;

export interface TraceStoreOptions {
  readonly exporter?: TraceExporter;
  readonly flushIntervalMs?: number;
}

export async function initTraceStoreTelemetry(serviceName = "trace-store"): Promise<void> {
  const { initGlobalOtel } = await import("@nebutra/logger/otel-bootstrap");
  initGlobalOtel({ serviceName });
}

const REDACT_KEYS = /api[_-]?key|token|secret|password|authorization|cookie|email/i;

export function redactTracePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactTracePayload);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = REDACT_KEYS.test(key) ? "[redacted]" : redactTracePayload(inner);
  }
  return out;
}

export function traceDebugPath(): string {
  return join(process.cwd(), ".nebutra", "debug", "trace-store.jsonl");
}

async function appendTraceDebug(record: NebuSpanRecord): Promise<void> {
  const path = traceDebugPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(record)}\n`, { flag: "a" });
}

export class NebuSpan {
  readonly #store: TraceStore;
  readonly #record: NebuSpanRecord;
  readonly #start = Date.now();

  constructor(store: TraceStore, record: NebuSpanRecord) {
    this.#store = store;
    this.#record = record;
  }

  end(attributes: Record<string, unknown> = {}): void {
    this.#store.enqueue({
      ...this.#record,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - this.#start,
      status: "ended",
      attributes: {
        ...(this.#record.attributes ?? {}),
        ...(redactTracePayload(attributes) as Record<string, unknown>),
      },
    });
  }

  fail(error: unknown): void {
    this.#store.enqueue({
      ...this.#record,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - this.#start,
      status: "failed",
      attributes: {
        ...(this.#record.attributes ?? {}),
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export class TraceStore {
  readonly #exporter: TraceExporter;
  readonly #queue: NebuSpanRecord[] = [];
  readonly #flushIntervalMs: number;
  #timer: NodeJS.Timeout | undefined;
  #lastSpanAt: string | undefined;

  constructor(options: TraceStoreOptions = {}) {
    this.#exporter =
      options.exporter ??
      (async (batch) => {
        await Promise.all(batch.map((record) => appendTraceDebug(record)));
      });
    this.#flushIntervalMs = options.flushIntervalMs ?? 250;
  }

  static default(): TraceStore {
    return new TraceStore();
  }

  start(kind: NebuSpanKind, name: string, attributes: Record<string, unknown> = {}): NebuSpan {
    const now = new Date().toISOString();
    return new NebuSpan(this, {
      id: `span_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      traceId: String(attributes.traceId ?? name),
      kind,
      name,
      startedAt: now,
      status: "started",
      attributes: redactTracePayload(attributes) as Record<string, unknown>,
    });
  }

  enqueue(record: NebuSpanRecord): void {
    this.#queue.push(record);
    this.#lastSpanAt = record.endedAt ?? record.startedAt;
    this.#timer ??= setTimeout(() => {
      this.flush().catch(() => undefined);
    }, this.#flushIntervalMs);
  }

  async flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    const batch = this.#queue.splice(0);
    if (batch.length === 0) return;
    await this.#exporter(batch);
  }

  doctor(): { ok: boolean; lastSpanAt?: string; suggestion?: string } {
    return this.#lastSpanAt
      ? { ok: true, lastSpanAt: this.#lastSpanAt }
      : {
          ok: false,
          suggestion: "Emit a span with TraceStore.start(...).end(...) or run the Layer 0 demo.",
        };
  }
}

export async function readTraceDebug(limit = 10): Promise<unknown[]> {
  try {
    const raw = await readFile(traceDebugPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch (cause) {
    const options = {
      suggestion: "Run `pnpm trace:doctor` after executing a traced workflow.",
      ...(cause instanceof Error && { cause }),
    };
    throw new CapabilityError("trace-store", "No trace debug log found", {
      ...options,
    });
  }
}
