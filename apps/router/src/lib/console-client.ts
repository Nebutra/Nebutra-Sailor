/**
 * The console's one fetch client.
 *
 * Every client component in `apps/router` goes through this file. It exists
 * because the hand-rolled `fetch` in each page did not check `res.ok`, so a
 * 401 rendered as an empty table: the UI said "you have no keys" when it meant
 * "you are not allowed to see them". A screen that cannot tell a refusal from
 * an empty result is a screen that lies about money.
 *
 * Three rules it enforces for every caller:
 *
 * 1. **A non-2xx is never data.** {@link consoleFetch} throws
 *    {@link ConsoleError}; it never returns a half-parsed body.
 * 2. **The response is decoded, not cast.** A `decode` function turns `unknown`
 *    into the caller's type at runtime. There is no `as` anywhere in the
 *    console's read path, so a shape change surfaces as a decode failure rather
 *    than as `undefined.toFixed` three renders later.
 * 3. **A superseded request is cancelled.** {@link createRequestLane} aborts the
 *    in-flight call when a newer one starts, so a slow first response can never
 *    overwrite a fast second one.
 *
 * Deliberately not SWR or React Query: one lane, one decoder and
 * `useTransition` cover what the console does, and the app does not need
 * another dependency to fetch six endpoints.
 */

/** A refusal from a console endpoint, or a transport failure dressed as one. */
export class ConsoleError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ConsoleError";
    this.status = status;
    this.code = code;
  }
}

/** True when a rejection is the caller's own abort, not a failure to report. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof Error && error.name === "AbortError";
}

/** A thrown value rendered as one sentence the customer can act on. */
export function describeError(error: unknown): string {
  if (error instanceof ConsoleError) return error.message;
  if (error instanceof Error) return error.message;
  return "请求失败，请重试。";
}

// ---------------------------------------------------------------------------
// Error envelopes
// ---------------------------------------------------------------------------

/**
 * The console routes answer `{ "error": "…" }`; the metered `/v1` edge answers
 * the OpenAI envelope `{ "error": { "message": …, "code": … } }`. The console
 * calls both — `/use` streams through the edge — so both are read here rather
 * than at two call sites that would drift.
 *
 * When a body carries neither, the status is translated. A blank error is worse
 * than a generic one: it renders as an empty panel that looks like success.
 */
export function parseErrorEnvelope(
  status: number,
  payload: unknown,
): { message: string; code: string | null } {
  const body = isRecord(payload) ? payload : {};
  const raw = body.error;

  if (typeof raw === "string" && raw.trim()) {
    return { message: raw.trim(), code: readOptionalString(body.code) };
  }
  if (isRecord(raw)) {
    const message = readOptionalString(raw.message);
    const code = readOptionalString(raw.code);
    if (message) return { message, code };
    if (code) return { message: statusMessage(status), code };
  }
  return { message: statusMessage(status), code: readOptionalString(body.code) };
}

function statusMessage(status: number): string {
  if (status === 401) return "登录状态已失效，请重新登录后再试。";
  if (status === 403) return "当前账号没有这个操作的权限。";
  if (status === 404) return "这条记录不存在，可能已被删除。";
  if (status === 409) return "当前状态无法执行这个操作。";
  if (status === 429) return "请求过于频繁，稍等几秒再试。";
  if (status === 501) return "这个功能尚未开通。";
  if (status >= 500) return `服务端出错了（HTTP ${status}），请重试或联系我们。`;
  if (status >= 400) return `请求被拒绝（HTTP ${status}）。`;
  return `意外的响应状态 HTTP ${status}。`;
}

// ---------------------------------------------------------------------------
// Runtime decoding — the replacement for `as`
// ---------------------------------------------------------------------------

export type Decoder<T> = (value: unknown) => T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function readOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** `undefined` for a body that carries nothing — a 204, or an ignored payload. */
export const decodeNothing: Decoder<void> = () => undefined;

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export interface ConsoleRequest<T> {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | undefined;
  /** Serialised as JSON. Omitted entirely when absent, so a GET stays a GET. */
  body?: unknown;
  decode: Decoder<T>;
  signal?: AbortSignal | undefined;
}

export async function consoleFetch<T>(request: ConsoleRequest<T>): Promise<T> {
  const { path, method = "GET", body, decode, signal } = request;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? { accept: "application/json" } : JSON_HEADERS,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
      credentials: "same-origin",
    });
  } catch (error) {
    // An abort is the caller's own decision and must not be reported as a
    // failure — it would paint an error panel over a screen the user just
    // navigated away from.
    if (isAbortError(error)) throw error;
    throw new ConsoleError("网络请求没有发出去，检查网络后重试。", 0, "network_error");
  }

  const payload = await readJsonBody(response);

  if (!response.ok) {
    const envelope = parseErrorEnvelope(response.status, payload);
    throw new ConsoleError(envelope.message, response.status, envelope.code);
  }
  return decode(payload);
}

const JSON_HEADERS = { "content-type": "application/json", accept: "application/json" } as const;

/**
 * A streamed POST that answers with the raw {@link Response}.
 *
 * `/use` relays server-sent events, so the body cannot be parsed up front. What
 * it still gets from this file is the part that was missing: a non-2xx is read
 * as an error envelope and thrown, so a refusal can never be written into the
 * output pane as if the model had said it.
 */
export async function consoleStream(
  path: string,
  body: unknown,
  signal?: AbortSignal | undefined,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
      credentials: "same-origin",
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ConsoleError("网络请求没有发出去，检查网络后重试。", 0, "network_error");
  }

  if (!response.ok) {
    const payload = await readJsonBody(response);
    const envelope = parseErrorEnvelope(response.status, payload);
    throw new ConsoleError(envelope.message, response.status, envelope.code);
  }
  return response;
}

/**
 * Split an SSE byte stream into `data:` payloads, `[DONE]` excluded.
 *
 * Chunk boundaries do not respect event boundaries — a single `read()` can end
 * halfway through a JSON object — so the tail is carried over rather than
 * parsed. Getting this wrong drops tokens at random under load, which looks
 * like the model misbehaving.
 */
export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const payload of sseDataLines(event)) yield payload;
        boundary = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    for (const payload of sseDataLines(buffer)) yield payload;
  } finally {
    reader.releaseLock();
  }
}

function sseDataLines(event: string): string[] {
  const payloads: string[] = [];
  for (const line of event.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    payloads.push(payload);
  }
  return payloads;
}

/** `null` for an empty or unparseable body — both are "there was no JSON". */
async function readJsonBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Request lanes
// ---------------------------------------------------------------------------

export interface RequestLane {
  /** Abort whatever this lane was doing and hand out a signal for the new call. */
  next(): AbortSignal;
  /** Abort without starting anything — for unmount. */
  cancel(): void;
}

/**
 * One lane per thing-being-loaded. Two clicks in a row on a filter produce two
 * requests; without a lane the slower one wins whenever the network disagrees
 * with the click order, and the table ends up showing the filter the user
 * already moved off.
 */
export function createRequestLane(): RequestLane {
  let controller: AbortController | null = null;
  return {
    next() {
      controller?.abort();
      controller = new AbortController();
      return controller.signal;
    },
    cancel() {
      controller?.abort();
      controller = null;
    },
  };
}

/** `?a=1&b=2`, skipping empty values, or `""` when nothing is set. */
export function queryString(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}
