import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isTurnTerminal, mergeTurnConfig, type TurnConfig } from "./model";
import { DEFAULT_CAPABILITY_POLICY, DENIED, isApproval, resolveRuleDecision } from "./policy";
import { METHOD_REGISTRY, resolveScope, scopeKey } from "./protocol";
import {
  InMemoryRolloutStore,
  PERSISTED_OUTPUT_MAX_BYTES,
  replay,
  sanitizeForPersist,
} from "./rollout";
import {
  assertSafePosture,
  CarinaProtocolError,
  createCarinaSandbox,
  createHttpSandbox,
  NoExecutorConfiguredError,
  REFUSING_SANDBOX,
  SandboxDelegationError,
} from "./sandbox";
import { ToolRegistry } from "./tools";

const baseConfig: TurnConfig = {
  model: "m",
  provider: "p",
  approvalPolicy: "on_request",
  capabilityPolicy: "external_sandbox",
};

describe("model", () => {
  it("merges overrides immutably", () => {
    const merged = mergeTurnConfig(baseConfig, { model: "x" });
    expect(merged.model).toBe("x");
    expect(baseConfig.model).toBe("m");
  });
  it("detects terminal turn events", () => {
    expect(
      isTurnTerminal({
        type: "turn.completed",
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 },
      }),
    ).toBe(true);
    expect(isTurnTerminal({ type: "turn.started" })).toBe(false);
  });
});

describe("policy", () => {
  it("defaults to external_sandbox posture", () => {
    expect(DEFAULT_CAPABILITY_POLICY.kind).toBe("external_sandbox");
  });
  it("forbidden rule auto-rejects regardless of policy", () => {
    expect(resolveRuleDecision("forbidden", { kind: "on_request" })).toBe("auto_reject");
  });
  it("prompt rule under never policy auto-rejects", () => {
    expect(resolveRuleDecision("prompt", { kind: "never" })).toBe("auto_reject");
  });
  it("prompt rule under granular respects the rules gate", () => {
    expect(
      resolveRuleDecision("prompt", {
        kind: "granular",
        config: {
          sandboxApproval: true,
          rules: false,
          skillApproval: false,
          requestPermissions: false,
          mcpElicitations: true,
        },
      }),
    ).toBe("auto_reject");
  });
  it("denied is not an approval", () => {
    expect(isApproval(DENIED)).toBe(false);
    expect(isApproval({ kind: "approved_for_session" })).toBe(true);
  });
});

describe("protocol", () => {
  it("scope key is tenant-prefixed and thread-isolated", () => {
    const a = resolveScope(METHOD_REGISTRY.turnStart, "t1", { threadId: "th1" });
    const b = resolveScope(METHOD_REGISTRY.turnStart, "t2", { threadId: "th1" });
    expect(scopeKey(a)).not.toBe(scopeKey(b)); // cross-tenant never shares a lane
    expect(scopeKey(a)).toContain("t:t1");
  });
  it("thread-scoped method without threadId fails closed", () => {
    expect(() => resolveScope(METHOD_REGISTRY.turnStart, "t1", {})).toThrow();
  });
});

describe("rollout", () => {
  it("caps oversized command output", () => {
    const big = "x".repeat(PERSISTED_OUTPUT_MAX_BYTES + 100);
    const out = sanitizeForPersist({
      id: "1",
      type: "command_execution",
      command: "c",
      aggregatedOutput: big,
      status: "completed",
    });
    expect((out as { aggregatedOutput: string }).aggregatedOutput.length).toBeLessThan(big.length);
  });
  it("replays an append-only log into derived state, bounded by compaction", async () => {
    const store = new InMemoryRolloutStore();
    const at = new Date().toISOString();
    await store.append({
      tenantId: "t",
      threadId: "th",
      type: "session_meta",
      config: baseConfig,
      at,
    });
    await store.append({
      tenantId: "t",
      threadId: "th",
      type: "event",
      at,
      event: { type: "item.completed", item: { id: "i1", type: "agent_message", text: "hi" } },
    });
    await store.append({
      tenantId: "t",
      threadId: "th",
      type: "compacted",
      summary: "summary",
      droppedThrough: "i1",
      at,
    });
    const proj = replay(await store.read("t", "th"));
    expect(proj?.compactionSummary).toBe("summary");
    expect(proj?.items).toHaveLength(0);
  });
});

describe("sandbox", () => {
  it("refuses execution by default (no in-process untrusted exec)", async () => {
    await expect(
      REFUSING_SANDBOX.exec({
        tenantId: "t",
        threadId: "th",
        command: "rm -rf /",
        capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
      }),
    ).rejects.toBeInstanceOf(NoExecutorConfiguredError);
  });
  it("refuses danger_full_access without explicit opt-in", () => {
    expect(() => assertSafePosture({ kind: "danger_full_access" })).toThrow();
    expect(() => assertSafePosture({ kind: "danger_full_access" }, true)).not.toThrow();
  });
  it("surfaces a fail-closed isolator refusal as an error, never a fake result", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ error: "execution_refused" }), {
        status: 403,
      })) as unknown as typeof fetch;
    const sandbox = createHttpSandbox("http://isolator:8020", fakeFetch);
    await expect(
      sandbox.exec({
        tenantId: "org_a",
        threadId: "th_1",
        command: "rm -rf /",
        capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
      }),
    ).rejects.toBeInstanceOf(SandboxDelegationError);
  });

  it("createCarinaSandbox speaks Carina JSON-RPC (hello + command.exec)", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fakeFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      bodies.push(body);
      if (body.method === "gateway.hello") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 1 } }),
          { status: 200 },
        );
      }
      if (body.method === "command.exec") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              decision: { decision_id: "perm_1", decision: "allowed" },
              result: {
                exit_code: 0,
                stdout: ["hi\n"],
                stderr: [],
                timed_out: false,
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "no" } }),
        {
          status: 200,
        },
      );
    }) as unknown as typeof fetch;

    const sandbox = createCarinaSandbox({
      baseUrl: "http://carina.local:7420/jsonrpc",
      token: "gw1_test",
      fetchImpl: fakeFetch,
    });
    const result = await sandbox.exec({
      tenantId: "org_a",
      threadId: "sess_1",
      command: "echo hi",
      capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
    });
    expect(result.exitCode).toBe(0);
    expect(result.aggregatedOutput).toBe("hi\n");
    expect(result.executedOn).toBe("carina");
    expect(result.decisionId).toBe("perm_1");
    expect(bodies[0]?.method).toBe("gateway.hello");
    expect(bodies[1]?.method).toBe("command.exec");
    const execParams = bodies[1]?.params as { session_id: string; argv: string[] };
    expect(execParams.session_id).toBe("sess_1");
    expect(execParams.argv).toEqual(["/bin/sh", "-c", "echo hi"]);
  });

  it("createCarinaSandbox fails closed on denied and low protocol version", async () => {
    const deniedFetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string; id?: number };
      if (body.method === "gateway.hello") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 1 } }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { decision: { decision: "denied", reason: "policy" } },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    await expect(
      createCarinaSandbox({
        baseUrl: "http://carina.local",
        fetchImpl: deniedFetch,
      }).exec({
        tenantId: "t",
        threadId: "s",
        command: "rm -rf /",
        capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
      }),
    ).rejects.toMatchObject({ name: "SandboxDelegationError", status: 403 });

    const oldHello = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { id?: number };
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 0 } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    await expect(
      createCarinaSandbox({
        baseUrl: "http://carina.local",
        fetchImpl: oldHello,
        minProtocolVersion: 1,
      }).exec({
        tenantId: "t",
        threadId: "s",
        command: "echo",
        capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
      }),
    ).rejects.toBeInstanceOf(CarinaProtocolError);
  });
});

describe("tools", () => {
  it("validates input and dispatches with tenant context", async () => {
    const reg = new ToolRegistry();
    reg.register(
      { name: "echo", description: "echo", inputSchema: z.object({ v: z.string() }) },
      async (input: { v: string }, ctx) => `${ctx.tenantId}:${input.v}`,
    );
    expect(await reg.dispatch("echo", { v: "hi" }, { tenantId: "t1", threadId: "th" })).toBe(
      "t1:hi",
    );
    await expect(
      reg.dispatch("echo", { v: 1 }, { tenantId: "t1", threadId: "th" }),
    ).rejects.toBeTruthy();
  });
});
