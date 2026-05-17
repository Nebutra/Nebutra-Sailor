/**
 * The unified executor: one call, three transports.
 *
 * Server-side and dependency-injected — `fetchImpl` defaults to global fetch,
 * `wsFactory` is required only for ws-stream. No browser globals, no implicit
 * network in tests (inject a stub fetch). Always resolves a `TransportResult`;
 * never throws for transport-level failures (they surface as `ok:false`).
 */

import { normalizeTransportMode, normalizeTransportOptions, valueByPath } from "./capability";
import type { TransportMode, TransportOptions, TransportRequest, TransportResult } from "./types";

export interface ExecuteDeps {
  /** Defaults to global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Required for `ws-stream`. Returns an object with the WS event surface. */
  readonly wsFactory?: (url: string) => WsLike;
}

export interface WsLike {
  send(data: string): void;
  close(): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: (() => void) | null;
  onopen: (() => void) | null;
}

function fail(message: string): TransportResult {
  return {
    ok: false,
    status: 0,
    data: null,
    text: "",
    aggregateText: "",
    events: [],
    errorMessage: message,
  };
}

function serializeBody(req: TransportRequest): BodyInit | undefined {
  const t = (req.bodyType ?? "json").toLowerCase();
  if (req.body == null) return undefined;
  if (t === "raw") return typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  if (t === "multipart") return req.body as BodyInit; // caller supplies FormData
  return typeof req.body === "string" ? req.body : JSON.stringify(req.body);
}

function parseSseChunk(
  buffer: string,
  options: TransportOptions,
): { events: unknown[]; deltas: string[]; done: boolean; rest: string } {
  const events: unknown[] = [];
  const deltas: string[] = [];
  let done = false;
  const parts = buffer.split(options.sseDelimiter);
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part.trim();
    if (!line) continue;
    const payload = line.startsWith(options.sseDataPrefix)
      ? line.slice(options.sseDataPrefix.length).trim()
      : line;
    if (payload === options.sseDoneToken) {
      done = true;
      continue;
    }
    let parsed: unknown = payload;
    try {
      parsed = JSON.parse(payload);
    } catch {
      /* keep raw string */
    }
    events.push(parsed);
    const delta = valueByPath(parsed, options.sseDeltaPath);
    if (typeof delta === "string") deltas.push(delta);
    else if (options.sseDeltaPath === "" && typeof payload === "string") deltas.push(payload);
  }
  return { events, deltas, done, rest };
}

export async function executeTransport(
  request: TransportRequest,
  transport: TransportMode | string = "http-json",
  transportOptions?: Partial<TransportOptions>,
  deps: ExecuteDeps = {},
): Promise<TransportResult> {
  if (!request?.url) return fail("request.url is empty");
  const mode = normalizeTransportMode(transport);
  const options = normalizeTransportOptions(transportOptions);
  const doFetch = deps.fetchImpl ?? globalThis.fetch;

  if (mode === "ws-stream") {
    if (!deps.wsFactory) return fail("ws-stream requires a wsFactory");
    return await runWs(request, options, deps.wsFactory);
  }

  if (typeof doFetch !== "function") return fail("no fetch implementation available");

  const headers: Record<string, string> = { ...(request.headers ?? {}) };
  const bodyType = (request.bodyType ?? "json").toLowerCase();
  if (bodyType === "json" && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (mode === "http-sse" && !headers.Accept && !headers.accept) {
    headers.Accept = "text/event-stream";
  }

  let res: Response;
  try {
    res = await doFetch(request.url, {
      method: (request.method ?? "POST").toUpperCase(),
      headers,
      body: serializeBody(request) ?? null,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "fetch failed");
  }

  if (mode === "http-sse" && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const events: unknown[] = [];
    const deltas: string[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunk = parseSseChunk(buf, options);
      buf = chunk.rest;
      events.push(...chunk.events);
      deltas.push(...chunk.deltas);
      if (chunk.done) break;
    }
    const aggregateText = deltas.join("");
    return {
      ok: res.ok,
      status: res.status,
      data: events.at(-1) ?? null,
      text: aggregateText,
      aggregateText,
      events,
    };
  }

  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-json response */
  }
  return { ok: res.ok, status: res.status, data, text, aggregateText: text, events: [] };
}

function runWs(
  request: TransportRequest,
  options: TransportOptions,
  wsFactory: (url: string) => WsLike,
): Promise<TransportResult> {
  return new Promise((resolve) => {
    let wsUrl = request.url;
    if (wsUrl.startsWith("http://")) wsUrl = `ws://${wsUrl.slice(7)}`;
    if (wsUrl.startsWith("https://")) wsUrl = `wss://${wsUrl.slice(8)}`;
    if (!/^wss?:\/\//i.test(wsUrl)) {
      resolve(fail("ws-stream needs a ws:// or wss:// endpoint"));
      return;
    }
    const events: unknown[] = [];
    const deltas: string[] = [];
    let settled = false;
    const ws = wsFactory(wsUrl);
    const finish = (ok: boolean, errorMessage?: string) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      const aggregateText = deltas.join("");
      resolve({
        ok,
        status: ok ? 200 : 0,
        data: events.at(-1) ?? null,
        text: aggregateText,
        aggregateText,
        events,
        ...(errorMessage ? { errorMessage } : {}),
      });
    };
    ws.onopen = () => {
      if (request.body != null) {
        ws.send(typeof request.body === "string" ? request.body : JSON.stringify(request.body));
      }
    };
    ws.onmessage = (ev) => {
      const raw = String(ev.data ?? "");
      if (raw === options.wsDoneToken) {
        finish(true);
        return;
      }
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        /* keep raw */
      }
      events.push(parsed);
      const delta = valueByPath(parsed, options.wsMessagePath);
      if (typeof delta === "string") deltas.push(delta);
      else if (options.wsMessagePath === "") deltas.push(raw);
    };
    ws.onerror = () => finish(false, "ws-stream error");
    ws.onclose = () => finish(true);
  });
}
