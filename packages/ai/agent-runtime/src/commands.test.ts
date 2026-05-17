/**
 * Tests for the slash-command registry — the unified command model.
 *
 * A command IS a Definition. Slash invocation and model invocation are two
 * front-doors to one expansion. Tier precedence + dual gate are delegated to
 * DefinitionResolver (asserted to work through the wrapper). Multi-tenant:
 * tenantId mandatory, fail-closed, cross-tenant impossible.
 */

import { describe, expect, it, vi } from "vitest";
import type { CommandRecord } from "./commands";
import { CommandRegistry, expandCommand } from "./commands";
import type { Frontmatter, SourceTier } from "./definitions";

function fm(over: Partial<Frontmatter> = {}): Frontmatter {
  return {
    name: over.name ?? "cmd",
    description: "",
    allowedTools: [],
    disallowedTools: [],
    argNames: [],
    modelInvocable: true,
    userInvocable: true,
    executionMode: "inline",
    paths: [],
    ...over,
  };
}

function rec(over: Partial<CommandRecord> & { slug: string; tenantId: string }): CommandRecord {
  return {
    sourceTier: "workspace" as SourceTier,
    bodyRef: `body:${over.slug}`,
    frontmatter: fm(over.frontmatter),
    ...over,
  };
}

describe("CommandRegistry — two front-doors to one record", () => {
  it("resolves the same record via both listForUser and listForModel", () => {
    const reg = new CommandRegistry([rec({ slug: "deploy", tenantId: "t1" })]);
    const u = reg.listForUser({ tenantId: "t1" });
    const m = reg.listForModel({ tenantId: "t1" });
    expect(u.map((c) => c.slug)).toEqual(["deploy"]);
    expect(m.map((c) => c.slug)).toEqual(["deploy"]);
  });

  it("hides userInvocable:false from listForUser but keeps it in listForModel", () => {
    const reg = new CommandRegistry([
      rec({ slug: "auto-only", tenantId: "t1", frontmatter: fm({ userInvocable: false }) }),
    ]);
    expect(reg.listForUser({ tenantId: "t1" })).toHaveLength(0);
    expect(reg.listForModel({ tenantId: "t1" }).map((c) => c.slug)).toEqual(["auto-only"]);
  });

  it("hides modelInvocable:false from listForModel but keeps it in listForUser", () => {
    const reg = new CommandRegistry([
      rec({ slug: "human-only", tenantId: "t1", frontmatter: fm({ modelInvocable: false }) }),
    ]);
    expect(reg.listForModel({ tenantId: "t1" })).toHaveLength(0);
    expect(reg.listForUser({ tenantId: "t1" }).map((c) => c.slug)).toEqual(["human-only"]);
  });

  it("recomputes per call so entitlement/flag changes apply live", () => {
    const r = rec({ slug: "gated", tenantId: "t1", availabilityPlans: ["pro"] });
    const reg = new CommandRegistry([r]);
    expect(reg.listForUser({ tenantId: "t1" })).toHaveLength(0);
    expect(reg.listForUser({ tenantId: "t1", plan: "pro" }).map((c) => c.slug)).toEqual(["gated"]);
  });
});

describe("CommandRegistry — delegated tier precedence + dual gate", () => {
  it("higher tier overrides lower on slug collision (through the wrapper)", () => {
    const reg = new CommandRegistry([
      rec({ slug: "x", tenantId: "t1", sourceTier: "workspace", bodyRef: "low" }),
      rec({ slug: "x", tenantId: "t1", sourceTier: "policy", bodyRef: "high" }),
    ]);
    const [c] = reg.listForUser({ tenantId: "t1" });
    expect(c?.bodyRef).toBe("high");
  });

  it("dual gate: enabled:false suppressed through the wrapper", () => {
    const reg = new CommandRegistry([rec({ slug: "off", tenantId: "t1", enabled: false })]);
    expect(reg.listForUser({ tenantId: "t1" })).toHaveLength(0);
    expect(reg.listForModel({ tenantId: "t1" })).toHaveLength(0);
  });

  it("resolveOne returns highest-precedence gated record", () => {
    const reg = new CommandRegistry([
      rec({ slug: "y", tenantId: "t1", sourceTier: "bundled", bodyRef: "lo" }),
      rec({ slug: "y", tenantId: "t1", sourceTier: "plugin", bodyRef: "hi" }),
    ]);
    expect(reg.resolveOne("y", { tenantId: "t1" })?.bodyRef).toBe("hi");
    expect(reg.resolveOne("missing", { tenantId: "t1" })).toBeUndefined();
  });
});

describe("CommandRegistry — multi-tenant fail-closed", () => {
  it("throws on empty tenantId at every entry point", () => {
    const reg = new CommandRegistry([rec({ slug: "a", tenantId: "t1" })]);
    expect(() => reg.listForUser({ tenantId: "" })).toThrow();
    expect(() => reg.listForModel({ tenantId: "" })).toThrow();
    expect(() => reg.resolveOne("a", { tenantId: "" })).toThrow();
  });

  it("never leaks another tenant's commands", () => {
    const reg = new CommandRegistry([
      rec({ slug: "secret", tenantId: "t2" }),
      rec({ slug: "mine", tenantId: "t1" }),
    ]);
    expect(reg.listForUser({ tenantId: "t1" }).map((c) => c.slug)).toEqual(["mine"]);
    expect(reg.resolveOne("secret", { tenantId: "t1" })).toBeUndefined();
  });
});

describe("expandCommand — pure prompt expansion", () => {
  it("splits positional input into argNames and substitutes into the body", async () => {
    const cmd = rec({
      slug: "greet",
      tenantId: "t1",
      frontmatter: fm({ argNames: ["who", "when"] }),
    });
    const loader = vi.fn(async () => "Hi ${who} at ${when} in ${workspace}");
    const out = await expandCommand(cmd, "alice noon", { workspace: "/repo" }, loader);
    expect(out.contentBlocks).toEqual([{ role: "user", content: "Hi alice at noon in /repo" }]);
  });

  it("folds extra positional args into the last declared arg", async () => {
    const cmd = rec({
      slug: "echo",
      tenantId: "t1",
      frontmatter: fm({ argNames: ["first", "rest"] }),
    });
    const loader = vi.fn(async () => "[${first}] [${rest}]");
    const out = await expandCommand(cmd, "one two three four", {}, loader);
    expect(out.contentBlocks[0]?.content).toBe("[one] [two three four]");
  });

  it("uses injected variables, not host env", async () => {
    process.env.LEAK_SECRET = "should-not-appear";
    const cmd = rec({ slug: "v", tenantId: "t1" });
    const loader = vi.fn(async () => "session=${sessionId} leak=${LEAK_SECRET}");
    const out = await expandCommand(cmd, "", { sessionId: "s-42" }, loader);
    expect(out.contentBlocks[0]?.content).toBe("session=s-42 leak=");
    delete process.env.LEAK_SECRET;
  });

  it("calls the lazy bodyLoader exactly once", async () => {
    const cmd = rec({ slug: "lazy", tenantId: "t1" });
    const loader = vi.fn(async () => "static body");
    await expandCommand(cmd, "", {}, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("returns declared allowedTools, model override, effort and execution mode", async () => {
    const cmd = rec({
      slug: "deploy",
      tenantId: "t1",
      frontmatter: fm({
        allowedTools: ["Bash", "Read"],
        model: "opus",
        effort: "high",
        executionMode: "fork",
      }),
    });
    const out = await expandCommand(cmd, "", {}, async () => "go");
    expect(out.allowedTools).toEqual(["Bash", "Read"]);
    expect(out.modelOverride).toBe("opus");
    expect(out.effort).toBe("high");
    expect(out.executionMode).toBe("fork");
  });

  it("omits modelOverride when frontmatter.model is 'inherit' or unset", async () => {
    const cmd = rec({ slug: "p", tenantId: "t1", frontmatter: fm({ model: "inherit" }) });
    const out = await expandCommand(cmd, "", {}, async () => "x");
    expect(out.modelOverride).toBeUndefined();
  });

  it("returned contentBlocks array is frozen (immutability)", async () => {
    const cmd = rec({ slug: "f", tenantId: "t1" });
    const out = await expandCommand(cmd, "", {}, async () => "y");
    expect(Object.isFrozen(out.contentBlocks)).toBe(true);
  });
});
