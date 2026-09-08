import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyContent } from "../../features/resume/editor/state";
import { issueFor, useResumeAutosave } from "../../features/resume/editor/useResumeAutosave";

const ok = () => new Response(JSON.stringify({ resume: {} }), { status: 200 });
const invalid = () =>
  new Response(
    JSON.stringify({ issues: [{ path: ["content", "basic", "name"], message: "Required" }] }),
    {
      status: 422,
    },
  );

describe("useResumeAutosave", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not save the initial content, then debounces a change into one PUT", async () => {
    fetchMock.mockResolvedValue(ok());
    const initial = emptyContent("A");
    const { result, rerender } = renderHook(({ c }) => useResumeAutosave(c, { debounceMs: 1000 }), {
      initialProps: { c: initial },
    });
    expect(result.current.status).toBe("idle");

    rerender({ c: { ...initial, basic: { name: "Al" } } });
    rerender({ c: { ...initial, basic: { name: "Ali" } } });
    expect(result.current.status).toBe("dirty");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body)).content.basic.name).toBe("Ali");
    expect(result.current.status).toBe("saved");
    expect(result.current.savedAt).not.toBeNull();
  });

  it("maps 422 issues to field paths and keeps the editor state", async () => {
    fetchMock.mockResolvedValue(invalid());
    const initial = emptyContent("A");
    const { result, rerender } = renderHook(({ c }) => useResumeAutosave(c, { debounceMs: 10 }), {
      initialProps: { c: initial },
    });
    rerender({ c: { ...initial, basic: { name: "" } } });
    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
    });
    expect(result.current.status).toBe("invalid");
    expect(issueFor(result.current.issues, "basic.name")).toBe("Required");
  });

  it("flush saves immediately and a network failure reports error", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const initial = emptyContent("A");
    const { result, rerender } = renderHook(
      ({ c }) => useResumeAutosave(c, { debounceMs: 60_000 }),
      {
        initialProps: { c: initial },
      },
    );
    rerender({ c: { ...initial, basic: { name: "B" } } });
    await act(async () => {
      await result.current.flush();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("error");
  });
});
