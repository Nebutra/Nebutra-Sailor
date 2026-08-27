import { describe, expect, it } from "vitest";
import { z } from "zod";
import { COMMAND_EXEC_TOOL_NAME, registerCommandExecTool } from "./command-exec";
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
  isCarinaSandbox,
  NoExecutorConfiguredError,
  REFUSING_SANDBOX,
  resolveCarinaSandboxFromEnv,
  resolveCarinaWorkspaceRoot,
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

describe("Carina Phase 2 host helpers", () => {
  it("resolveCarinaSandboxFromEnv fails closed when co-deploy is off", () => {
    expect(resolveCarinaSandboxFromEnv({ CARINA_CODEPLOY: "0" })).toBe(REFUSING_SANDBOX);
  });

  it("resolveCarinaSandboxFromEnv co-deploys by default (socket sandbox)", () => {
    expect(isCarinaSandbox(resolveCarinaSandboxFromEnv({}))).toBe(true);
  });

  it("resolveCarinaSandboxFromEnv builds a Carina sandbox when URL is set", () => {
    const sandbox = resolveCarinaSandboxFromEnv({
      CARINA_JSONRPC_URL: "http://127.0.0.1:7420/jsonrpc",
      CARINA_JSONRPC_TOKEN: "gw1_test",
    });
    expect(isCarinaSandbox(sandbox)).toBe(true);
  });

  it("ensureSession caches session_id and command.exec uses it", async () => {
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
      if (body.method === "session.create") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { id: "carina_sess_99", status: "active" },
          }),
          { status: 200 },
        );
      }
      if (body.method === "command.exec") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              decision: { decision: "allowed", decision_id: "d1" },
              result: { exit_code: 0, stdout: ["ok\n"], stderr: [] },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "no" } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const sandbox = createCarinaSandbox({
      baseUrl: "http://carina.local",
      fetchImpl: fakeFetch,
    });

    const sid1 = await sandbox.ensureSession({
      threadId: "thread_a",
      workspaceRoot: "/work/repo",
      tenantId: "org_a",
    });
    expect(sid1).toBe("carina_sess_99");
    // second call is cached — no extra session.create
    const sid2 = await sandbox.ensureSession({
      threadId: "thread_a",
      workspaceRoot: "/work/repo",
    });
    expect(sid2).toBe("carina_sess_99");
    expect(bodies.filter((b) => b.method === "session.create")).toHaveLength(1);

    const result = await sandbox.exec({
      tenantId: "org_a",
      threadId: "thread_a",
      command: "echo ok",
      capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
    });
    expect(result.exitCode).toBe(0);
    const exec = bodies.find((b) => b.method === "command.exec");
    expect((exec?.params as { session_id: string }).session_id).toBe("carina_sess_99");
  });

  it("registerCommandExecTool ensures session then execs", async () => {
    const methods: string[] = [];
    const fakeFetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string; id?: number };
      methods.push(body.method ?? "");
      if (body.method === "gateway.hello") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 1 } }),
          { status: 200 },
        );
      }
      if (body.method === "session.create") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { session_id: "s_42" } }),
          { status: 200 },
        );
      }
      if (body.method === "command.exec") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              decision: { decision: "allowed" },
              result: { exit_code: 0, stdout: ["done"], stderr: [] },
            },
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;

    const sandbox = createCarinaSandbox({ baseUrl: "http://c", fetchImpl: fakeFetch });
    const reg = new ToolRegistry();
    registerCommandExecTool(reg, { sandbox, workspaceRoot: "/tmp/ws" });
    expect(reg.list().map((t) => t.definition.name)).toContain(COMMAND_EXEC_TOOL_NAME);

    const out = (await reg.dispatch(
      COMMAND_EXEC_TOOL_NAME,
      { command: "true" },
      { tenantId: "org", threadId: "th1" },
    )) as { exitCode: number; executedOn: string };

    expect(out.exitCode).toBe(0);
    expect(out.executedOn).toBe("carina");
    expect(methods).toEqual(["gateway.hello", "session.create", "command.exec"]);
  });
});

describe("Carina workspace + approval", () => {
  it("resolveCarinaWorkspaceRoot prefers map then template then root", () => {
    expect(
      resolveCarinaWorkspaceRoot("org_a", {
        CARINA_WORKSPACE_MAP: JSON.stringify({ org_a: "/a" }),
        CARINA_WORKSPACE_ROOT: "/root",
      }),
    ).toBe("/a");
    expect(
      resolveCarinaWorkspaceRoot("org_b", {
        CARINA_WORKSPACE_TEMPLATE: "/ws/{tenantId}",
        CARINA_WORKSPACE_ROOT: "/root",
      }),
    ).toBe("/ws/org_b");
    expect(resolveCarinaWorkspaceRoot("x", { CARINA_WORKSPACE_ROOT: "/root" })).toBe("/root");
    expect(resolveCarinaWorkspaceRoot("x", {})).toBeUndefined();
  });

  it("resolveApproval calls governance.approval.resolve", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fakeFetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      bodies.push(body);
      if (body.method === "gateway.hello") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 1 } }),
          { status: 200 },
        );
      }
      if (body.method === "governance.approval.resolve") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { resolved: true } }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;

    const sandbox = createCarinaSandbox({ baseUrl: "http://c", fetchImpl: fakeFetch });
    const result = await sandbox.resolveApproval({
      decisionId: "dec_1",
      approve: true,
      scope: "once",
      approver: "user_1",
    });
    expect(result).toEqual({ resolved: true });
    expect(bodies.some((b) => b.method === "governance.approval.resolve")).toBe(true);
  });

  it("autoApproveOnRequire retries command.exec after resolve", async () => {
    let execCount = 0;
    const fakeFetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string; id?: number };
      if (body.method === "gateway.hello") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol_version: 1 } }),
          { status: 200 },
        );
      }
      if (body.method === "governance.approval.resolve") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { ok: true } }), {
          status: 200,
        });
      }
      if (body.method === "command.exec") {
        execCount += 1;
        if (execCount === 1) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: { decision: { decision: "requires_approval", decision_id: "d9" } },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              decision: { decision: "allowed", decision_id: "d9" },
              result: { exit_code: 0, stdout: ["ok"], stderr: [] },
            },
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;

    const sandbox = createCarinaSandbox({
      baseUrl: "http://c",
      fetchImpl: fakeFetch,
      autoApproveOnRequire: true,
      skipHello: false,
    });
    const result = await sandbox.exec({
      tenantId: "t",
      threadId: "s",
      command: "echo ok",
      capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
    });
    expect(result.exitCode).toBe(0);
    expect(execCount).toBe(2);
  });
});
