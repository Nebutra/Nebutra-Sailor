import { describe, expect, it, vi } from "vitest";
import {
  type ActionPorts,
  ActionRunner,
  ArtifactStreamParser,
  type PlanAction,
  stripFencedWrapper,
  unescapeEntities,
} from "./artifact-stream";

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("stripFencedWrapper", () => {
  it("strips a single ```lang fenced wrapper", () => {
    expect(stripFencedWrapper("```ts\nconst a = 1;\n```")).toBe("const a = 1;");
  });

  it("strips a bare ``` fence", () => {
    expect(stripFencedWrapper("```\nhello\n```")).toBe("hello");
  });

  it("leaves unfenced content untouched", () => {
    expect(stripFencedWrapper("plain text")).toBe("plain text");
  });

  it("does not strip inner fences (single wrapper only)", () => {
    const input = "```md\nuse ```code``` here\n```";
    expect(stripFencedWrapper(input)).toBe("use ```code``` here");
  });
});

describe("unescapeEntities", () => {
  it("unescapes &lt; and &gt;", () => {
    expect(unescapeEntities("a &lt;tag&gt; b")).toBe("a <tag> b");
  });

  it("is a no-op without entities", () => {
    expect(unescapeEntities("nothing here")).toBe("nothing here");
  });
});

// ── Parser ───────────────────────────────────────────────────────────────────

function collector() {
  const events: string[] = [];
  return {
    events,
    onArtifactOpen: vi.fn((e) => events.push(`open:${e.artifactId}:${e.title}`)),
    onArtifactClose: vi.fn((e) => events.push(`close:${e.artifactId}`)),
    onActionOpen: vi.fn((e) => events.push(`aopen:${e.actionId}:${e.action.type}`)),
    onActionStream: vi.fn((e) => events.push(`astream:${e.actionId}`)),
    onActionClose: vi.fn((e) => events.push(`aclose:${e.actionId}:${e.action.type}`)),
  };
}

const CTX = { tenantId: "org_123" };

describe("ArtifactStreamParser", () => {
  it("parses a single-action artifact in one chunk", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse(
      "m1",
      CTX,
      `<artifact id="a1" title="Build">` +
        `<action type="file" filePath="src/x.ts">const x = 1;</action></artifact>`,
    );

    expect(c.onArtifactOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "org_123",
        messageId: "m1",
        artifactId: "a1",
        title: "Build",
      }),
    );
    expect(c.onActionClose).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "org_123",
        action: { type: "file", filePath: "src/x.ts", content: "const x = 1;" },
      }),
    );
    expect(c.onArtifactClose).toHaveBeenCalledTimes(1);
  });

  it("handles a tag split across two chunks without dup emit", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse("m1", CTX, `<artifact id="a1" title="Sp`);
    p.parse("m1", CTX, `lit"><action type="shell">npm i</acti`);
    p.parse("m1", CTX, `on></artifact>`);

    expect(c.onArtifactOpen).toHaveBeenCalledTimes(1);
    expect(c.onArtifactOpen).toHaveBeenCalledWith(
      expect.objectContaining({ artifactId: "a1", title: "Split" }),
    );
    expect(c.onActionClose).toHaveBeenCalledTimes(1);
    expect(c.onActionClose).toHaveBeenCalledWith(
      expect.objectContaining({ action: { type: "shell", content: "npm i" } }),
    );
    expect(c.onArtifactClose).toHaveBeenCalledTimes(1);
  });

  it("streams partial content via onActionStream then final via onActionClose", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse("m1", CTX, `<artifact id="a1" title="T"><action type="file" filePath="f">par`);
    p.parse("m1", CTX, `tial</action></artifact>`);

    expect(c.onActionStream).toHaveBeenCalled();
    expect(c.onActionClose).toHaveBeenCalledWith(
      expect.objectContaining({ action: { type: "file", filePath: "f", content: "partial" } }),
    );
  });

  it("strips a fenced wrapper and unescapes entities in action content", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse(
      "m1",
      CTX,
      '<artifact id="a1" title="T"><action type="file" filePath="f">' +
        "```ts\nconst t = &lt;X&gt;();\n```" +
        "</action></artifact>",
    );

    expect(c.onActionClose).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: "file", filePath: "f", content: "const t = <X>();" },
      }),
    );
  });

  it("preserves order of multiple actions in one artifact", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse(
      "m1",
      CTX,
      `<artifact id="a1" title="Multi">` +
        `<action type="file" filePath="a.ts">A</action>` +
        `<action type="shell">npm test</action>` +
        `<action type="start">npm run dev</action>` +
        `</artifact>`,
    );

    const opens = c.events.filter((e) => e.startsWith("aclose:"));
    expect(opens).toEqual(["aclose:0:file", "aclose:1:shell", "aclose:2:start"]);
  });

  it("parses a data action with operation + projectId", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse(
      "m1",
      CTX,
      `<artifact id="a1" title="T"><action type="data" operation="migration" projectId="p1">SQL</action></artifact>`,
    );

    expect(c.onActionClose).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: "data", operation: "migration", projectId: "p1", content: "SQL" },
      }),
    );
  });

  it("isolates state per messageId", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    p.parse("m1", CTX, `<artifact id="a1" title="One">`);
    p.parse("m2", CTX, `<artifact id="b1" title="Two">`);
    p.parse("m1", CTX, `<action type="shell">x</action></artifact>`);
    p.parse("m2", CTX, `<action type="shell">y</action></artifact>`);

    expect(c.onArtifactOpen).toHaveBeenCalledWith(expect.objectContaining({ artifactId: "a1" }));
    expect(c.onArtifactOpen).toHaveBeenCalledWith(expect.objectContaining({ artifactId: "b1" }));
    expect(c.onActionClose).toHaveBeenCalledTimes(2);
  });

  it("fails closed on empty tenantId", () => {
    const c = collector();
    const p = new ArtifactStreamParser(c);
    expect(() => p.parse("m1", { tenantId: "" }, '<artifact id="a" title="T">')).toThrow();
  });
});

// ── Runner ───────────────────────────────────────────────────────────────────

function ports() {
  const p = {
    writeFile: vi.fn(async (_a: PlanAction, _c: { tenantId: string }) => undefined),
    runShell: vi.fn(async (_a: PlanAction, _c: { tenantId: string }) => ({
      exitCode: 0,
      output: "ok",
    })),
    dataOp: vi.fn(async (_a: PlanAction, _c: { tenantId: string }) => undefined),
  };
  return p as typeof p & ActionPorts;
}

const fileAction: PlanAction = { type: "file", filePath: "a.ts", content: "x" };
const shellAction: PlanAction = { type: "shell", content: "npm i" };

describe("ActionRunner — state machine", () => {
  it("transitions pending -> running -> complete", async () => {
    const r = new ActionRunner(ports(), CTX);
    r.register("0", fileAction);
    expect(r.get("0").status).toBe("pending");
    await r.runAction("0");
    expect(r.get("0").status).toBe("complete");
    expect(r.get("0").executed).toBe(true);
  });

  it("delegates file write to injected port (no in-proc exec)", async () => {
    const p = ports();
    const r = new ActionRunner(p, CTX);
    r.register("0", fileAction);
    await r.runAction("0");
    expect(p.writeFile).toHaveBeenCalledWith(
      fileAction,
      expect.objectContaining({ tenantId: "org_123" }),
    );
  });

  it("delegates shell to injected port", async () => {
    const p = ports();
    const r = new ActionRunner(p, CTX);
    r.register("0", shellAction);
    await r.runAction("0");
    expect(p.runShell).toHaveBeenCalledWith(
      shellAction,
      expect.objectContaining({ tenantId: "org_123" }),
    );
  });

  it("delegates data action to dataOp port", async () => {
    const p = ports();
    const r = new ActionRunner(p, CTX);
    const dataAction: PlanAction = { type: "data", operation: "query", content: "SELECT 1" };
    r.register("0", dataAction);
    await r.runAction("0");
    expect(p.dataOp).toHaveBeenCalledWith(
      dataAction,
      expect.objectContaining({ tenantId: "org_123" }),
    );
  });

  it("transitions to failed when a port throws", async () => {
    const p = ports();
    p.runShell.mockRejectedValueOnce(new Error("boom"));
    const r = new ActionRunner(p, CTX);
    r.register("0", shellAction);
    await r.runAction("0");
    expect(r.get("0").status).toBe("failed");
    expect(r.get("0").error).toContain("boom");
  });

  it("throws on illegal transition (run an already complete action)", async () => {
    const r = new ActionRunner(ports(), CTX);
    r.register("0", fileAction);
    await r.runAction("0");
    await expect(r.runAction("0")).rejects.toThrow();
  });

  it("abort allowed from pending", () => {
    const r = new ActionRunner(ports(), CTX);
    r.register("0", fileAction);
    r.abort("0");
    expect(r.get("0").status).toBe("aborted");
  });

  it("abort rejected from complete", async () => {
    const r = new ActionRunner(ports(), CTX);
    r.register("0", fileAction);
    await r.runAction("0");
    expect(() => r.abort("0")).toThrow();
  });
});

describe("ActionRunner — queue", () => {
  it("runs actions in submission order", async () => {
    const p = ports();
    const order: string[] = [];
    p.writeFile.mockImplementation(async (a: PlanAction) => {
      order.push((a as { filePath: string }).filePath);
    });
    const r = new ActionRunner(p, CTX);
    r.register("0", { type: "file", filePath: "first", content: "" });
    r.register("1", { type: "file", filePath: "second", content: "" });
    await r.runQueue();
    expect(order).toEqual(["first", "second"]);
  });

  it("a failed required action halts the queue", async () => {
    const p = ports();
    p.runShell.mockRejectedValueOnce(new Error("fail"));
    const r = new ActionRunner(p, CTX);
    r.register("0", shellAction);
    r.register("1", fileAction);
    await r.runQueue();
    expect(r.get("0").status).toBe("failed");
    expect(r.get("1").status).toBe("pending");
    expect(p.writeFile).not.toHaveBeenCalled();
  });

  it("continueOnError keeps draining the queue", async () => {
    const p = ports();
    p.runShell.mockRejectedValueOnce(new Error("fail"));
    const r = new ActionRunner(p, CTX);
    r.register("0", shellAction);
    r.register("1", fileAction);
    await r.runQueue({ continueOnError: true });
    expect(r.get("0").status).toBe("failed");
    expect(r.get("1").status).toBe("complete");
  });
});

describe("ActionRunner — tenant isolation", () => {
  it("fails closed on empty tenantId", () => {
    expect(() => new ActionRunner(ports(), { tenantId: "" })).toThrow();
  });

  it("cross-tenant action map access is impossible", () => {
    const a = new ActionRunner(ports(), { tenantId: "org_a" });
    a.register("0", fileAction);
    const b = new ActionRunner(ports(), { tenantId: "org_b" });
    expect(() => b.get("0")).toThrow();
    expect(a.get("0").status).toBe("pending");
  });
});
