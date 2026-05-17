/**
 * Multi-transport request layer.
 *
 * The absorbed product unified three response transports behind one call —
 * `http-json`, `http-sse` (delta-path SSE), `ws-stream` — gated by a per-model
 * capability schema and a contract validator that rejects template/capability/
 * transport mismatches. That abstraction is real IP; re-expressed here as a
 * server-side, dependency-injected executor (no browser/localStorage
 * assumptions, deterministic to test).
 */

export type TransportMode = "http-json" | "http-sse" | "ws-stream";

export const TRANSPORT_HTTP_JSON = "http-json" as const;
export const TRANSPORT_HTTP_SSE = "http-sse" as const;
export const TRANSPORT_WS_STREAM = "ws-stream" as const;

/** What a model can do — every flag defaults false unless its type implies it. */
export interface CapabilitySchema {
  readonly supportsMultipart: boolean;
  readonly supportsRequestChain: boolean;
  readonly supportsSSE: boolean;
  readonly supportsWS: boolean;
  readonly supportsTools: boolean;
}

export interface TransportOptions {
  readonly sseDataPrefix: string;
  readonly sseDoneToken: string;
  /** Dot-path into a parsed SSE event to pull the text delta. "" = whole. */
  readonly sseDeltaPath: string;
  readonly sseDelimiter: string;
  readonly wsMessagePath: string;
  readonly wsDoneToken: string;
}

export const DEFAULT_TRANSPORT_OPTIONS: TransportOptions = Object.freeze({
  sseDataPrefix: "data:",
  sseDoneToken: "[DONE]",
  sseDeltaPath: "",
  sseDelimiter: "\n\n",
  wsMessagePath: "",
  wsDoneToken: "[DONE]",
});

export interface TransportRequest {
  readonly url: string;
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly bodyType?: "json" | "raw" | "multipart";
  readonly timeoutMs?: number;
}

export interface TransportResult {
  readonly ok: boolean;
  readonly status: number;
  readonly data: unknown;
  /** Raw response text (or accumulated stream text). */
  readonly text: string;
  /** Concatenated stream deltas (sse/ws); equals `text` for json. */
  readonly aggregateText: string;
  /** Decoded streamed events, in order. */
  readonly events: readonly unknown[];
  readonly errorMessage?: string;
}

export interface ContractIssue {
  readonly level: "error" | "warning";
  readonly code: string;
  readonly message: string;
}

/** Minimal model entry the contract validator inspects. */
export interface ModelContractEntry {
  readonly type?: string;
  readonly transport?: string;
  readonly capabilities?: Partial<CapabilitySchema>;
  readonly requestTemplate?: { bodyType?: string; endpoint?: string; body?: unknown };
  readonly requestChain?: { enabled?: boolean; steps?: unknown[] };
}
