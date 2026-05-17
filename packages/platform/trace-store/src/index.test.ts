import { describe, expect, it } from "vitest";
import { redactTracePayload, TraceStore } from "./index";

describe("TraceStore", () => {
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
});
