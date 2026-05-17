import { describe, expect, it, vi } from "vitest";
import {
  type HookConfig,
  type HookContext,
  type HookEvent,
  matchesMatcher,
  onHookEvent,
  runHooks,
} from "./hook-pipeline.js";

const ctx: HookContext = { tenantId: "org_123", threadId: "th_1" };

describe("matchesMatcher (pure)", () => {
  it('"*" matches anything', () => {
    expect(matchesMatcher("*", "Write")).toBe(true);
    expect(matchesMatcher("*", "anything")).toBe(true);
  });

  it("exact match", () => {
    expect(matchesMatcher("Write", "Write")).toBe(true);
    expect(matchesMatcher("Write", "Edit")).toBe(false);
  });

  it("pipe-list match", () => {
    expect(matchesMatcher("Write|Edit", "Edit")).toBe(true);
    expect(matchesMatcher("Write|Edit", "Write")).toBe(true);
    expect(matchesMatcher("Write|Edit", "Read")).toBe(false);
  });

  it("regex match", () => {
    expect(matchesMatcher("/^mcp__/", "mcp__github")).toBe(true);
    expect(matchesMatcher("/^mcp__/", "Write")).toBe(false);
  });
});

describe("ifCondition gating", () => {
  it("skips transport when ifCondition returns false", async () => {
    const run = vi.fn(async () => ({ additionalContext: "ran" }));
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        ifCondition: (input) => (input as { go?: boolean }).go === true,
        transport: { kind: "function", run },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: { go: false } }, hooks, ctx);
    expect(run).not.toHaveBeenCalled();
    expect(out.additionalContext).toBeUndefined();
  });

  it("runs transport when ifCondition returns true", async () => {
    const run = vi.fn(async () => ({ additionalContext: "ran" }));
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        ifCondition: (input) => (input as { go?: boolean }).go === true,
        transport: { kind: "function", run },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: { go: true } }, hooks, ctx);
    expect(run).toHaveBeenCalledTimes(1);
    expect(out.additionalContext).toBe("ran");
  });
});

describe("function transport exit-code lane", () => {
  it("code 2 maps stderr to blockingError", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: { kind: "function", run: async () => ({ code: 2, stderr: "nope" }) },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.blockingError).toBe("nope");
    expect(out.preventContinuation).toBe(true);
  });

  it("code 0 produces no blocking error", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: { kind: "function", run: async () => ({ code: 0, stdout: "ok" }) },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.blockingError).toBeUndefined();
  });
});

describe("http transport (fail-closed)", () => {
  it("rejects non-https url", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: {
          kind: "http",
          url: "http://insecure.example.com/hook",
          fetchImpl: async () => new Response("{}", { status: 200 }),
        },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.blockingError).toBeDefined();
    expect(out.preventContinuation).toBe(true);
  });

  it("fail-closed on non-2xx", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: {
          kind: "http",
          url: "https://hooks.example.com/h",
          fetchImpl: async () => new Response("err", { status: 500 }),
        },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.blockingError).toBeDefined();
    expect(out.preventContinuation).toBe(true);
  });

  it("2xx parses partial outcome JSON body", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: {
          kind: "http",
          url: "https://hooks.example.com/h",
          fetchImpl: async () =>
            new Response(JSON.stringify({ additionalContext: "from-http" }), { status: 200 }),
        },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.additionalContext).toBe("from-http");
  });
});

describe("prompt transport", () => {
  it("delegates to injected llmEval", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: {
          kind: "prompt",
          model: "test-model",
          llmEval: async () => ({ permissionBehavior: "deny", stopReason: "policy" }),
        },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.permissionBehavior).toBe("deny");
  });
});

describe("parallel fan-out + precedence merge", () => {
  it("deny beats allow; contexts concatenated stably; last updatedInput wins", async () => {
    const hooks: HookConfig[] = [
      {
        event: "PreToolUse",
        matcher: "*",
        transport: {
          kind: "function",
          run: async () => ({
            permissionBehavior: "allow",
            additionalContext: "A",
            updatedInput: { v: 1 },
          }),
        },
      },
      {
        event: "PreToolUse",
        matcher: "Write",
        transport: {
          kind: "function",
          run: async () => ({
            permissionBehavior: "deny",
            additionalContext: "B",
            updatedInput: { v: 2 },
          }),
        },
      },
    ];
    const out = await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(out.permissionBehavior).toBe("deny");
    expect(out.additionalContext).toBe("A\nB");
    expect(out.updatedInput).toEqual({ v: 2 });
  });

  it("preventContinuation halts and surfaces stopReason", async () => {
    const hooks: HookConfig[] = [
      {
        event: "Stop",
        matcher: "*",
        transport: {
          kind: "function",
          run: async () => ({ preventContinuation: true, stopReason: "halt" }),
        },
      },
    ];
    const out = await runHooks("Stop", { name: "Stop", input: {} }, hooks, ctx);
    expect(out.preventContinuation).toBe(true);
    expect(out.stopReason).toBe("halt");
  });

  it("only runs hooks matching event + matcher", async () => {
    const ran = vi.fn(async () => ({ additionalContext: "x" }));
    const skipped = vi.fn(async () => ({ additionalContext: "y" }));
    const hooks: HookConfig[] = [
      { event: "PreToolUse", matcher: "Write", transport: { kind: "function", run: ran } },
      { event: "PreToolUse", matcher: "Read", transport: { kind: "function", run: skipped } },
      { event: "PostToolUse", matcher: "*", transport: { kind: "function", run: skipped } },
    ];
    await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    expect(ran).toHaveBeenCalledTimes(1);
    expect(skipped).not.toHaveBeenCalled();
  });
});

describe("multi-tenant fail-closed", () => {
  it("throws when tenantId is empty", async () => {
    await expect(
      runHooks("PreToolUse", { name: "Write", input: {} }, [], {
        tenantId: "",
        threadId: "th_1",
      }),
    ).rejects.toThrow();
  });
});

describe("progress emitter", () => {
  it("fires started + completed decoupled from outcomes", async () => {
    const events: string[] = [];
    const off = onHookEvent((e) => events.push(`${e.phase}:${e.event}`));
    const hooks: HookConfig[] = [
      { event: "PreToolUse", matcher: "*", transport: { kind: "function", run: async () => ({}) } },
    ];
    await runHooks("PreToolUse", { name: "Write", input: {} }, hooks, ctx);
    off();
    expect(events).toContain("started:PreToolUse");
    expect(events).toContain("completed:PreToolUse");
  });
});

describe("HookEvent taxonomy", () => {
  it("type accepts the full event union", () => {
    const all: HookEvent[] = [
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "UserPromptSubmit",
      "SessionStart",
      "SessionEnd",
      "Stop",
      "StopFailure",
      "SubagentStart",
      "SubagentStop",
      "PreCompact",
      "PostCompact",
      "PermissionRequest",
      "PermissionDenied",
      "TaskCreated",
      "TaskCompleted",
      "ConfigChange",
      "FileChanged",
    ];
    expect(all).toHaveLength(18);
  });
});
