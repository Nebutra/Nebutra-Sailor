import { afterEach, describe, expect, it, vi } from "vitest";
import { redactTracePayload, TraceStore } from "./index";

describe("TraceStore", () => {
  afterEach(() => {
    vi.doUnmock("node:fs/promises");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("batches redacted spans asynchronously", async () => {
    const emitted: unknown[] = [];
    const trace = new TraceStore({
      exporter: async (batch) => {
        emitted.push(...batch);
      },
      flushIntervalMs: 1,
    });

    const span = trace.start("llm", "thread_1", { prompt: "hi", apiKey: "secret" });
    span.end({ output: "ok" });
    await trace.flush();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ kind: "llm", name: "thread_1" });
    expect(JSON.stringify(emitted[0])).not.toContain("secret");
  });

  it("redacts PII-shaped fields", () => {
    expect(redactTracePayload({ password: "x", nested: { token: "y" } })).toEqual({
      password: "[redacted]",
      nested: { token: "[redacted]" },
    });
  });

  it("caps default debug-file writes during burst flushes", async () => {
    let activeWrites = 0;
    let maxActiveWrites = 0;

    vi.doMock("node:fs/promises", () => ({
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      writeFile: vi.fn(async () => {
        activeWrites += 1;
        maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
        await new Promise((resolve) => setTimeout(resolve, 0));
        activeWrites -= 1;
      }),
    }));

    const { TraceStore: MockedTraceStore } = await import("./index");
    const trace = new MockedTraceStore({ flushIntervalMs: 60_000 });

    for (let index = 0; index < 12; index += 1) {
      trace.start("tool", `tool_${index}`).end();
    }

    await trace.flush();

    expect(maxActiveWrites).toBeLessThanOrEqual(4);
  });
});
