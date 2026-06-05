/**
 * QuickJS sandbox tests — proves the core mechanism end-to-end against the real
 * WASM VM: the guest-async `agent()` round-trip, real host-side `parallel()`
 * concurrency through the single-threaded VM, the `args` global, opts
 * pass-through, and the host-enforced agent-count cap. The model call behind
 * `agent()` is a fake host — no provider, no network.
 */

import { describe, expect, it } from "vitest";
import { createQuickJSSandbox } from "../quickjs-sandbox";
import { REFUSING_WORKFLOW_SANDBOX } from "../sandbox";
import type { AgentCallOpts, HostBindings, SandboxLimits } from "../types";

const limits = (over: Partial<SandboxLimits> = {}): SandboxLimits => ({
  maxConcurrency: 16,
  maxAgentsPerRun: 1000,
  maxRetries: 2,
  timeoutMs: 5000,
  memoryBytes: 64 * 1024 * 1024,
  ...over,
});

// Host-side micro-yield: enough to let p-limit-permitted agent calls overlap
// (concurrency is gated by p-limit, not by elapsed time) without a real timer.
const microYield = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

function echoHost(over: Partial<HostBindings> = {}): HostBindings {
  return {
    async agent(prompt) {
      return `echo:${prompt}`;
    },
    log() {},
    phase() {},
    ...over,
  };
}

describe("createQuickJSSandbox", () => {
  it("round-trips an awaited agent() call (guest async over the WASM VM)", async () => {
    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `const r = await agent("hi"); return r + "!";`,
      args: {},
      limits: limits(),
      host: echoHost(),
    });

    expect(result.ok).toBe(true);
    expect(result.returnValue).toBe("echo:hi!");
  });

  it("exposes the args global to the script", async () => {
    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `return args.x + args.y;`,
      args: { x: 41, y: 1 },
      limits: limits(),
      host: echoHost(),
    });

    expect(result.ok).toBe(true);
    expect(result.returnValue).toBe(42);
  });

  it("runs parallel() with real host-side concurrency despite the single-threaded VM", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const host = echoHost({
      async agent(prompt) {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await microYield();
        inFlight--;
        return prompt;
      },
    });

    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `return await parallel([() => agent("a"), () => agent("b"), () => agent("c")]);`,
      args: {},
      limits: limits({ maxConcurrency: 16 }),
      host,
    });

    expect(result.ok).toBe(true);
    expect(result.returnValue).toEqual(["a", "b", "c"]);
    expect(maxInFlight).toBe(3); // all three truly concurrent
  });

  it("caps concurrency at maxConcurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const host = echoHost({
      async agent(prompt) {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await microYield();
        inFlight--;
        return prompt;
      },
    });

    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `return await parallel([() => agent("a"), () => agent("b"), () => agent("c")]);`,
      args: {},
      limits: limits({ maxConcurrency: 1 }),
      host,
    });

    expect(result.ok).toBe(true);
    expect(maxInFlight).toBe(1); // serialized by the host semaphore
  });

  it("passes agent opts (model meta) through to the host", async () => {
    let seen: AgentCallOpts | undefined;
    const host = echoHost({
      async agent(prompt, opts) {
        seen = opts;
        return prompt;
      },
    });

    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `return await agent("p", { model: { id: "fast" }, label: "x" });`,
      args: {},
      limits: limits(),
      host,
    });

    expect(result.ok).toBe(true);
    expect(seen).toEqual({ model: { id: "fast" }, label: "x" });
  });

  it("enforces maxAgentsPerRun (a not-ok run, not a hang)", async () => {
    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `await agent("1"); await agent("2"); return "done";`,
      args: {},
      limits: limits({ maxAgentsPerRun: 1 }),
      host: echoHost(),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("maxAgentsPerRun");
  });

  it("surfaces a guest throw as a not-ok result", async () => {
    const sandbox = createQuickJSSandbox();
    const result = await sandbox.run({
      scriptSource: `throw new Error("boom");`,
      args: {},
      limits: limits(),
      host: echoHost(),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });
});

describe("REFUSING_WORKFLOW_SANDBOX", () => {
  it("refuses to execute (fail-closed default)", async () => {
    await expect(
      REFUSING_WORKFLOW_SANDBOX.run({
        scriptSource: "return 1;",
        args: {},
        limits: limits(),
        host: echoHost(),
      }),
    ).rejects.toThrow(/refusing to execute/i);
  });
});
