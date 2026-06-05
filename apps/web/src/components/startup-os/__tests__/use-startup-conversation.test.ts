// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type FetchImpl, useStartupConversation } from "../use-startup-conversation";

const encoder = new TextEncoder();

/** Builds an SSE frame `event: <type>\ndata: <json>\n\n`. */
function frame(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Wraps a list of string chunks in an event-stream `Response`. Each chunk is a
 * separate `enqueue` so the hook's parser is exercised across chunk boundaries.
 */
function sseResponse(chunks: readonly string[], init?: { status?: number }): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: init?.status ?? 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}

/** A JSON pre-stream response (e.g. 503 missing provider key). */
function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Canonical happy-path frame sequence from the P2 contract. */
function happyPathChunks(): readonly string[] {
  return [
    frame("status", { phase: "started", occurredAt: "2026-06-05T00:00:00.000Z" }),
    frame("status", { phase: "planning", occurredAt: "2026-06-05T00:00:01.000Z" }),
    frame("plan-delta", { text: "Wire up " }),
    frame("plan-delta", { text: "the landing page." }),
    frame("status", { phase: "generating", occurredAt: "2026-06-05T00:00:02.000Z" }),
    frame("status", { phase: "applying", occurredAt: "2026-06-05T00:00:03.000Z" }),
    frame("file", {
      path: "app/page.tsx",
      language: "tsx",
      action: "updated",
      occurredAt: "2026-06-05T00:00:03.000Z",
    }),
    frame("artifact", { kind: "landing_page", status: "ready", summary: "Landing page ready" }),
    frame("summary", { text: "Updated the landing page." }),
    frame("done", {
      summary: "Updated the landing page.",
      fileCount: 1,
      artifactCount: 1,
      provider: "openrouter",
      model: "fast",
      totalTokens: 1200,
      occurredAt: "2026-06-05T00:00:04.000Z",
    }),
    "event: end\ndata: [DONE]\n\n",
  ];
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useStartupConversation", () => {
  it("starts idle and exposes a stable action surface", () => {
    const fetchImpl: FetchImpl = vi.fn();
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    expect(result.current.status).toBe("idle");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.plan).toBe("");
    expect(result.current.fileEvents).toEqual([]);
    expect(result.current.artifactEvents).toEqual([]);
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.send).toBe("function");
    expect(typeof result.current.cancel).toBe("function");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accumulates plan text, collects file/artifact events, and finishes on done", async () => {
    const fetchImpl: FetchImpl = vi.fn().mockResolvedValue(sseResponse(happyPathChunks()));
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("Build the landing page");
    });

    await waitFor(() => expect(result.current.status).toBe("done"));

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.plan).toBe("Wire up the landing page.");
    expect(result.current.fileEvents).toHaveLength(1);
    expect(result.current.fileEvents[0]?.path).toBe("app/page.tsx");
    expect(result.current.artifactEvents).toHaveLength(1);
    expect(result.current.artifactEvents[0]).toMatchObject({
      kind: "landing_page",
      status: "ready",
    });
    expect(result.current.summary).toEqual({
      summary: "Updated the landing page.",
      fileCount: 1,
      artifactCount: 1,
      provider: "openrouter",
      model: "fast",
      totalTokens: 1200,
    });
    expect(result.current.error).toBeNull();
  });

  it("POSTs the instruction as a JSON body to the project chat route", async () => {
    const fetchImpl: FetchImpl = vi.fn().mockResolvedValue(sseResponse(happyPathChunks()));
    const { result } = renderHook(() =>
      useStartupConversation({ projectId: "proj/ä 1", fetchImpl }),
    );

    await act(async () => {
      await result.current.send("Ship it");
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    // projectId is URL-encoded into the path.
    expect(url).toBe(`/api/startup-os/projects/${encodeURIComponent("proj/ä 1")}/chat`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ instruction: "Ship it" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("parses frames split across chunk boundaries", async () => {
    // Re-chunk the full happy-path payload into arbitrary byte slices so a
    // single SSE frame straddles two reads.
    const full = happyPathChunks().join("");
    const mid = Math.floor(full.length / 2);
    const fetchImpl: FetchImpl = vi
      .fn()
      .mockResolvedValue(sseResponse([full.slice(0, mid), full.slice(mid)]));
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("split test");
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.plan).toBe("Wire up the landing page.");
    expect(result.current.fileEvents).toHaveLength(1);
  });

  it("surfaces an in-stream error frame as the error state", async () => {
    const chunks = [
      frame("status", { phase: "started", occurredAt: "2026-06-05T00:00:00.000Z" }),
      frame("plan-delta", { text: "Trying..." }),
      frame("error", {
        message: "Startup OS model response must be strict JSON.",
        occurredAt: "2026-06-05T00:00:05.000Z",
      }),
      "event: end\ndata: [DONE]\n\n",
    ];
    const fetchImpl: FetchImpl = vi.fn().mockResolvedValue(sseResponse(chunks));
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("break it");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toContain("strict JSON");
    expect(result.current.summary).toBeNull();
    // Plan accumulated before the error is preserved.
    expect(result.current.plan).toBe("Trying...");
  });

  it("cancel() aborts the request — fetch receives the abort signal", async () => {
    let capturedSignal: AbortSignal | undefined;
    // A fetch that resolves only when the signal aborts, mimicking a hung stream.
    const fetchImpl: FetchImpl = vi.fn((_, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = result.current.send("hang");
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(true));
    expect(capturedSignal?.aborted).toBe(false);

    act(() => {
      result.current.cancel();
    });
    await act(async () => {
      await sendPromise;
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.status).toBe("cancelled");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a 503 JSON pre-stream response as an error without crashing", async () => {
    const fetchImpl: FetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(503, { error: "Startup OS AI execution requires a private provider key." }),
      );
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("no key");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Startup OS AI execution requires a private provider key.");
    expect(result.current.fileEvents).toEqual([]);
    expect(result.current.summary).toBeNull();
  });

  it("surfaces a thrown fetch rejection as an error state", async () => {
    const fetchImpl: FetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("offline");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("network down");
  });

  it("reset() clears accumulated state back to idle", async () => {
    const fetchImpl: FetchImpl = vi.fn().mockResolvedValue(sseResponse(happyPathChunks()));
    const { result } = renderHook(() => useStartupConversation({ projectId: "proj_1", fetchImpl }));

    await act(async () => {
      await result.current.send("Build the landing page");
    });
    await waitFor(() => expect(result.current.status).toBe("done"));

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.plan).toBe("");
    expect(result.current.fileEvents).toEqual([]);
    expect(result.current.summary).toBeNull();
  });
});
