import { describe, expect, it } from "vitest";
import type { Definition, Frontmatter } from "./definitions";
import { DefinitionResolver } from "./definitions";
import type { ThreadItem, TurnUsage } from "./model";
import {
  assertNotPeeking,
  prepareDispatch,
  resolveSubagentTools,
  type SubagentRecord,
  settleDeferred,
  TaskRegistry,
} from "./subagents";

const fm = (over: Partial<Frontmatter> = {}): Frontmatter => ({
  name: "researcher",
  description: "",
  allowedTools: [],
  disallowedTools: [],
  argNames: [],
  modelInvocable: true,
  userInvocable: true,
  executionMode: "fork",
  paths: [],
  ...over,
});

const def = (over: Partial<Frontmatter> = {}, slug = "researcher"): SubagentRecord => ({
  slug,
  tenantId: "org_1",
  sourceTier: "workspace",
  frontmatter: fm(over),
  bodyRef: "ref://researcher",
});

const usage: TurnUsage = {
  inputTokens: 10,
  cachedInputTokens: 0,
  outputTokens: 5,
  reasoningOutputTokens: 0,
};

const msg = (id: string, text: string): ThreadItem => ({ id, type: "agent_message", text });

describe("resolveSubagentTools", () => {
  it("computes allow minus deny", () => {
    const tools = resolveSubagentTools(
      fm({ allowedTools: ["read", "write", "exec"], disallowedTools: ["exec"] }),
      ["read", "write", "exec", "search"],
    );
    expect(tools).toEqual(["read", "write"]);
  });

  it("falls back to all-except-deny when allow empty", () => {
    const tools = resolveSubagentTools(fm({ allowedTools: [], disallowedTools: ["exec"] }), [
      "read",
      "write",
      "exec",
    ]);
    expect(tools).toEqual(["read", "write"]);
  });

  it("intersects allow with the universe (no phantom tools)", () => {
    const tools = resolveSubagentTools(fm({ allowedTools: ["read", "ghost"] }), ["read", "write"]);
    expect(tools).toEqual(["read"]);
  });
});

describe("prepareDispatch spawn", () => {
  it("throws when brief missing in spawn mode", () => {
    expect(() =>
      prepareDispatch({
        definition: def(),
        mode: "spawn",
        brief: "",
        ctx: { tenantId: "org_1" },
      }),
    ).toThrow(/brief/i);
  });

  it("starts with zero inherited context", () => {
    const parentItems = [msg("p1", "parent secret")];
    const out = prepareDispatch({
      definition: def({ allowedTools: ["read"] }),
      mode: "spawn",
      parentItems,
      brief: "do the thing",
      ctx: { tenantId: "org_1" },
      allTools: ["read", "write"],
    });
    expect(out.initialContext).toHaveLength(1);
    expect(out.initialContext[0]).toMatchObject({ type: "agent_message" });
    expect(JSON.stringify(out.initialContext)).not.toContain("parent secret");
    expect(out.toolScope).toEqual(["read"]);
  });

  it("passes model override through", () => {
    const out = prepareDispatch({
      definition: def({ model: "fast-tier" }),
      mode: "spawn",
      brief: "go",
      ctx: { tenantId: "org_1" },
    });
    expect(out.modelOverride).toBe("fast-tier");
  });
});

describe("prepareDispatch fork", () => {
  it("inherits parentItems with incomplete tool calls filtered", () => {
    const parentItems: ThreadItem[] = [
      msg("a", "hello"),
      {
        id: "tc1",
        type: "mcp_tool_call",
        server: "s",
        tool: "t",
        arguments: {},
        status: "completed",
      },
      msg("b", "world"),
      {
        id: "tc2",
        type: "mcp_tool_call",
        server: "s",
        tool: "t",
        arguments: {},
        status: "in_progress",
      },
    ];
    const snapshot = JSON.stringify(parentItems);
    const out = prepareDispatch({
      definition: def(),
      mode: "fork",
      parentItems,
      brief: "continue",
      ctx: { tenantId: "org_1" },
    });
    const ids = out.initialContext.map((i) => i.id);
    expect(ids).toContain("a");
    expect(ids).toContain("tc1");
    expect(ids).toContain("b");
    expect(ids).not.toContain("tc2");
    // brief appended as a directive
    expect(out.initialContext.at(-1)).toMatchObject({ type: "agent_message" });
    // parentItems untouched
    expect(JSON.stringify(parentItems)).toBe(snapshot);
  });

  it("fork without parentItems yields just the directive", () => {
    const out = prepareDispatch({
      definition: def(),
      mode: "fork",
      brief: "lone directive",
      ctx: { tenantId: "org_1" },
    });
    expect(out.initialContext).toHaveLength(1);
  });
});

describe("DispatchEnvelope sync normalization", () => {
  it("normalizes empty content to an explicit marker item", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    const env = settleDeferred(
      { taskId: id, channel: "ch", tenantId: "org_1", registry: reg },
      [],
      usage,
    );
    expect(env.kind).toBe("sync");
    if (env.kind === "sync") {
      expect(env.content).toHaveLength(1);
      expect(env.content[0]).toMatchObject({ type: "error" });
      expect(env.agentId).toBe(id);
    }
  });

  it("settleDeferred yields sync shape with metrics", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    const env = settleDeferred(
      { taskId: id, channel: "ch", tenantId: "org_1", registry: reg },
      [
        msg("r1", "result"),
        {
          id: "u1",
          type: "mcp_tool_call",
          server: "s",
          tool: "t",
          arguments: {},
          status: "completed",
        },
      ],
      usage,
    );
    expect(env.kind).toBe("sync");
    if (env.kind === "sync") {
      expect(env.content).toHaveLength(2);
      expect(env.toolUses).toBe(1);
      expect(env.usage).toEqual(usage);
      expect(env.durationMs).toBeGreaterThanOrEqual(0);
    }
    expect(reg.get(id, "org_1")?.status).toBe("completed");
  });
});

describe("assertNotPeeking", () => {
  it("throws while task is in-flight", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    expect(() => assertNotPeeking(reg.get(id, "org_1")!)).toThrow(/in-flight|peek/i);
  });

  it("does not throw once settled", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    reg.transition(id, "completed", "org_1");
    expect(() => assertNotPeeking(reg.get(id, "org_1")!)).not.toThrow();
  });
});

describe("TaskRegistry state machine + tenancy", () => {
  it("creates prefixed ids", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    expect(id.startsWith("task_")).toBe(true);
  });

  it("allows legal transitions", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    reg.transition(id, "completed", "org_1");
    expect(reg.get(id, "org_1")?.status).toBe("completed");
  });

  it("rejects illegal transitions", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    reg.transition(id, "completed", "org_1");
    expect(() => reg.transition(id, "running", "org_1")).toThrow(/transition/i);
  });

  it("stop() kills a task", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    reg.transition(id, "running", "org_1");
    reg.stop(id, "org_1");
    expect(reg.get(id, "org_1")?.status).toBe("killed");
  });

  it("fails closed on cross-tenant access", () => {
    const reg = new TaskRegistry();
    const id = reg.create("org_1", "subagent");
    expect(() => reg.transition(id, "running", "org_2")).toThrow(/tenant/i);
    expect(() => reg.stop(id, "org_2")).toThrow(/tenant/i);
    expect(reg.get(id, "org_2")).toBeUndefined();
  });

  it("throws on empty tenant", () => {
    const reg = new TaskRegistry();
    expect(() => reg.create("", "subagent")).toThrow(/tenant/i);
    const id = reg.create("org_1", "subagent");
    expect(() => reg.transition(id, "running", "")).toThrow(/tenant/i);
    expect(() => reg.get(id, "")).toThrow(/tenant/i);
  });

  it("prepareDispatch fails closed on tenant mismatch", () => {
    const d: SubagentRecord = def();
    expect(() =>
      prepareDispatch({
        definition: d,
        mode: "spawn",
        brief: "x",
        ctx: { tenantId: "org_2" },
      }),
    ).toThrow(/tenant/i);
  });

  it("resolver-backed registry is reusable as a DefinitionResolver", () => {
    const resolver = new DefinitionResolver<SubagentRecord>([def(), def({}, "writer")]);
    const resolved = resolver.resolveOne("researcher", { tenantId: "org_1" });
    expect(resolved?.slug).toBe("researcher");
    const d: Definition | undefined = resolved;
    expect(d).toBeDefined();
  });
});
