"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { StartupConversationEvent } from "@/lib/startup-os/conversation";

/**
 * Client hook that drives the Startup OS SSE chat route from the browser.
 *
 * The route at `POST /api/startup-os/projects/{projectId}/chat` needs a JSON
 * body, so we cannot use the native `EventSource` (it only issues GET requests
 * with no body). Instead we POST with `fetch` and read the `text/event-stream`
 * response body through a `ReadableStream` reader, parsing SSE frames
 * incrementally across chunk boundaries.
 *
 * `fetchImpl` is injectable (default `globalThis.fetch`) so unit tests can hand
 * the hook a stubbed `Response` whose body is a `ReadableStream` — no network
 * and no provider key required.
 */

// ─── Narrowed event sub-types (derived from the wire union) ───────────────────

type FileEvent = Extract<StartupConversationEvent, { type: "file" }>;
type ArtifactEvent = Extract<StartupConversationEvent, { type: "artifact" }>;
type DoneEvent = Extract<StartupConversationEvent, { type: "done" }>;
type StatusEvent = Extract<StartupConversationEvent, { type: "status" }>;

export type StartupConversationStatus = "idle" | "streaming" | "done" | "error" | "cancelled";

export interface StartupConversationSummary {
  readonly summary: string;
  readonly fileCount: number;
  readonly artifactCount: number;
  readonly provider: string;
  readonly model: string;
  readonly totalTokens: number;
}

export interface UseStartupConversationState {
  readonly status: StartupConversationStatus;
  readonly isStreaming: boolean;
  /** Accumulated plan prose (every `plan-delta` text appended in order). */
  readonly plan: string;
  readonly fileEvents: readonly FileEvent[];
  readonly artifactEvents: readonly ArtifactEvent[];
  readonly summary: StartupConversationSummary | null;
  readonly error: string | null;
  /** ISO timestamp of the first status event of the current turn. */
  readonly startedAt: string | null;
  /** Wall-clock duration of the completed turn, in ms (null until done). */
  readonly durationMs: number | null;
  /** Server-assigned id of the current turn (for revert-and-resend). */
  readonly turnId: string | null;
  /** The instruction the user sent for the current turn (the user message). */
  readonly userPrompt: string | null;
}

export interface UseStartupConversationResult extends UseStartupConversationState {
  send: (instruction: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface UseStartupConversationOptions {
  readonly projectId: string;
  /** Injectable fetch — default `globalThis.fetch`. Tests pass a stub. */
  readonly fetchImpl?: FetchImpl;
}

const INITIAL_STATE: UseStartupConversationState = {
  status: "idle",
  isStreaming: false,
  plan: "",
  fileEvents: [],
  artifactEvents: [],
  summary: null,
  error: null,
  startedAt: null,
  durationMs: null,
  turnId: null,
  userPrompt: null,
};

// ─── SSE frame parsing (buffered, chunk-boundary safe) ────────────────────────

interface ParsedFrame {
  readonly event: string;
  readonly data: string;
}

/**
 * Splits a buffer into complete SSE frames (separated by a blank line) and the
 * trailing partial frame. Frames look like `event: <type>\ndata: <json>\n\n`.
 * The partial remainder is returned so the next chunk can complete it.
 */
function splitFrames(buffer: string): {
  readonly frames: readonly ParsedFrame[];
  readonly rest: string;
} {
  // Normalize CRLF so the blank-line split is consistent across servers.
  const normalized = buffer.replace(/\r\n/g, "\n");
  const segments = normalized.split("\n\n");
  // The last segment is either empty (buffer ended on a boundary) or a partial
  // frame that has not yet been terminated — keep it for the next chunk.
  const rest = segments.pop() ?? "";

  const frames: ParsedFrame[] = [];
  for (const segment of segments) {
    const block = segment.trim();
    if (block.length === 0) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }
    frames.push({ event, data: dataLines.join("\n") });
  }

  return { frames, rest };
}

/**
 * Reconstructs a typed `StartupConversationEvent` from a wire frame. The frame
 * name is the event `type`; the data is the JSON body minus that `type` field.
 * Returns `null` for control frames (`end`) or anything that fails to parse, so
 * a malformed frame never crashes the consumer.
 */
function toConversationEvent(frame: ParsedFrame): StartupConversationEvent | null {
  if (frame.event === "end") return null;
  if (frame.data.length === 0 || frame.data === "[DONE]") return null;

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(frame.data);
    if (parsed === null || typeof parsed !== "object") return null;
    data = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  return { type: frame.event, ...data } as StartupConversationEvent;
}

// ─── State reducer (immutable folds, one per event type) ──────────────────────

function applyEvent(
  state: UseStartupConversationState,
  event: StartupConversationEvent,
): UseStartupConversationState {
  switch (event.type) {
    case "turn":
      return { ...state, turnId: event.turnId };
    case "status":
      return applyStatus(state, event);
    case "plan-delta":
      return { ...state, plan: state.plan + event.text };
    case "file":
      return { ...state, fileEvents: [...state.fileEvents, event] };
    case "artifact":
      return { ...state, artifactEvents: [...state.artifactEvents, event] };
    case "summary":
      // The terminal `done` carries the authoritative summary; the standalone
      // `summary` frame is informational and folded into `done` below.
      return state;
    case "done":
      return applyDone(state, event);
    case "error":
      return { ...state, status: "error", isStreaming: false, error: event.message };
    default:
      return state;
  }
}

function applyStatus(
  state: UseStartupConversationState,
  event: StatusEvent,
): UseStartupConversationState {
  if (event.phase === "done") {
    // `done` event sets the final status; never downgrade an error.
    return state;
  }
  if (state.status === "error") return state;
  return {
    ...state,
    status: "streaming",
    isStreaming: true,
    startedAt: state.startedAt ?? event.occurredAt,
  };
}

function applyDone(
  state: UseStartupConversationState,
  event: DoneEvent,
): UseStartupConversationState {
  return {
    ...state,
    status: "done",
    isStreaming: false,
    durationMs: state.startedAt
      ? Date.parse(event.occurredAt) - Date.parse(state.startedAt)
      : null,
    summary: {
      summary: event.summary,
      fileCount: event.fileCount,
      artifactCount: event.artifactCount,
      provider: event.provider,
      model: event.model,
      totalTokens: event.totalTokens,
    },
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStartupConversation(
  options: UseStartupConversationOptions,
): UseStartupConversationResult {
  const { projectId, fetchImpl } = options;
  const [state, setState] = useState<UseStartupConversationState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    abortRef.current = null;
    setState((prev) =>
      prev.isStreaming ? { ...prev, status: "cancelled", isStreaming: false } : prev,
    );
  }, []);

  const send = useCallback(
    async (instruction: string) => {
      // Cancel any in-flight turn before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const doFetch: FetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
      const url = `/api/startup-os/projects/${encodeURIComponent(projectId)}/chat`;

      setState({ ...INITIAL_STATE, status: "streaming", isStreaming: true, userPrompt: instruction });

      try {
        const response = await doFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
          signal: controller.signal,
        });

        // A 503/JSON pre-stream response (e.g. missing provider key) never opens
        // the event-stream — surface its error without touching the reader.
        const contentType = response.headers.get("Content-Type") ?? "";
        if (!response.ok || !contentType.includes("text/event-stream")) {
          const message = await readErrorMessage(response);
          setState((prev) => ({ ...prev, status: "error", isStreaming: false, error: message }));
          abortRef.current = null;
          return;
        }

        const body = response.body;
        if (!body) {
          setState((prev) => ({
            ...prev,
            status: "error",
            isStreaming: false,
            error: "Response had no readable body.",
          }));
          abortRef.current = null;
          return;
        }

        await consumeStream(body, controller.signal, (event) => {
          setState((prev) => applyEvent(prev, event));
        });
        abortRef.current = null;
      } catch (error) {
        if (controller.signal.aborted) {
          // Aborts are deliberate (cancel()/reset()) — never an error state here;
          // cancel() already moved status to "cancelled".
          abortRef.current = null;
          return;
        }
        const message = error instanceof Error ? error.message : "Conversation request failed.";
        setState((prev) => ({ ...prev, status: "error", isStreaming: false, error: message }));
        abortRef.current = null;
      }
    },
    [fetchImpl, projectId],
  );

  return useMemo(() => ({ ...state, send, cancel, reset }), [state, send, cancel, reset]);
}

// ─── Stream consumption helpers ───────────────────────────────────────────────

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onEvent: (event: StartupConversationEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { frames, rest } = splitFrames(buffer);
      buffer = rest;
      for (const frame of frames) {
        const event = toConversationEvent(frame);
        if (event) onEvent(event);
      }
    }

    // Flush any complete frame left in the tail after the stream closes.
    buffer += decoder.decode();
    const { frames } = splitFrames(buffer.endsWith("\n\n") ? buffer : `${buffer}\n\n`);
    for (const frame of frames) {
      const event = toConversationEvent(frame);
      if (event) onEvent(event);
    }
  } finally {
    reader.releaseLock();
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
    ) {
      return (payload as { error: string }).error;
    }
  } catch {
    // Body was not JSON — fall through to the status-based message.
  }
  return `Request failed with status ${response.status}.`;
}
