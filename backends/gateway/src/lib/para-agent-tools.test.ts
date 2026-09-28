import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceRepo = { findWorkspace: vi.fn(), putDocument: vi.fn() };
const assetRepo = { find: vi.fn() };
vi.mock("@nebutra/billing", () => ({
  deductCredits: vi.fn(),
  refundCredits: vi.fn(),
  BillingError: class BillingError extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("@nebutra/repositories", () => ({
  getParaWorkspaceRepository: () => workspaceRepo,
  getParaAssetRepository: () => assetRepo,
}));

const origin = { tenantId: "org_1", userId: "user_1", role: "org:admin", plan: "PRO" };

const doc = (nodes: Record<string, unknown> = {}) => ({
  version: 2,
  nodes,
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
});

const source = {
  id: "n1",
  type: "image",
  status: "completed",
  x: 100,
  y: 50,
  width: 320,
  height: 180,
};

async function load() {
  return import("./para-agent-tools.js");
}

describe("para agent tools", () => {
  beforeEach(() => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("AI_SERVICE_URL", "https://origin.example");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "gateway-secret");
    vi.stubEnv("SERVICE_SECRET", "service-secret");
    workspaceRepo.findWorkspace.mockReset();
    workspaceRepo.putDocument.mockReset();
    assetRepo.find.mockReset();
    workspaceRepo.putDocument.mockImplementation(async (_id, _v, d) => ({
      workspace: { document: d },
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("the autonomy switch gates only the tools that spend", async () => {
    const { createParaRuleEvaluator } = await load();
    const ask = createParaRuleEvaluator("ASK");
    const act = createParaRuleEvaluator("ACT");

    expect(ask("canvas_read")).toBe("allow");
    expect(ask("create_text_node")).toBe("allow");
    expect(ask("generate_image")).toBe("prompt");

    // "Act without asking" never turns a read into something needing approval — it only lifts the gate.
    expect(act("canvas_read")).toBe("allow");
    expect(act("generate_image")).toBe("allow");
  });

  it("cost is estimated per output and only for spending tools", async () => {
    const { estimateToolCost } = await load();
    expect(estimateToolCost("canvas_read", {})).toBe(0);
    expect(estimateToolCost("create_text_node", { count: 4 })).toBe(0);
    // Same table submitParaGenerateJob charges from (para-credits.ts): image 10, video one
    // default clip of the default model (Wan 2.7, 720P, 5 s × 13).
    expect(estimateToolCost("generate_image", { count: 4 })).toBe(40);
    expect(estimateToolCost("generate_image", { mode: "video", count: 2 })).toBe(130);
    expect(estimateToolCost("generate_image", { count: 99 })).toBe(40);
  });

  it("generate_image derives a queued child with a derived edge and never touches the source", async () => {
    const { createParaToolRegistry } = await load();
    workspaceRepo.findWorkspace.mockResolvedValue({
      id: "w1",
      documentVersion: 3,
      document: doc({ n1: source }),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "task_1" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const tools = createParaToolRegistry({
      tenantId: "org_1",
      workspaceId: "w1",
      origin,
      contextNodeIds: ["n1"],
    });
    const result = (await tools.dispatch(
      "generate_image",
      { prompt: "colder" },
      { tenantId: "org_1", threadId: "t1" },
    )) as { nodeId: string; jobId: string; sourceNodeId: string };

    expect(result.jobId).toBe("task_1");
    expect(result.sourceNodeId).toBe("n1");

    const written = workspaceRepo.putDocument.mock.calls[0]?.[2] as {
      nodes: Record<string, { x: number; status: string; generator?: { prompt?: string } }>;
      edges: Record<string, { source: string; target: string; kind: string }>;
    };
    expect(written.nodes.n1).toEqual(source);
    const child = written.nodes[result.nodeId];
    expect(child).toMatchObject({ status: "queued", x: 100 + 320 + 48 });
    expect(child?.generator?.prompt).toBe("colder");
    expect(Object.values(written.edges)).toEqual([
      expect.objectContaining({ source: "n1", target: result.nodeId, kind: "derived" }),
    ]);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      type: string;
      payload: { nodeId: string; generator: { references: { id: string }[] } };
    };
    expect(body.type).toBe("para.generate");
    expect(body.payload.nodeId).toBe(result.nodeId);
    expect(body.payload.generator.references[0]?.id).toBe("n1");
  });

  it("generate_image sends the source node's asset URL when it is on PARA's asset host", async () => {
    vi.stubEnv("UPLOAD_PUBLIC_BASE_URL", "https://cdn.para.test");
    const { createParaToolRegistry } = await load();
    workspaceRepo.findWorkspace.mockResolvedValue({
      id: "w1",
      documentVersion: 3,
      document: doc({ n1: { ...source, assetId: "a1" } }),
    });
    assetRepo.find.mockResolvedValue({ id: "a1", url: "https://cdn.para.test/para/x.png" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "task_1" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    const tools = createParaToolRegistry({
      tenantId: "org_1",
      workspaceId: "w1",
      origin,
      contextNodeIds: ["n1"],
    });
    await tools.dispatch(
      "generate_image",
      { prompt: "night" },
      { tenantId: "org_1", threadId: "t" },
    );

    expect(assetRepo.find).toHaveBeenCalledWith("a1");
    const body = JSON.parse(String((fetchSpy.mock.calls[0]?.[1] as RequestInit).body)) as {
      payload: { generator: { references: { id: string; url?: string }[] } };
    };
    expect(body.payload.generator.references[0]).toEqual({
      kind: "node",
      id: "n1",
      url: "https://cdn.para.test/para/x.png",
    });
  });

  it("generate_image leaves the URL off when the asset is not on PARA's host", async () => {
    vi.stubEnv("UPLOAD_PUBLIC_BASE_URL", "https://cdn.para.test");
    const { createParaToolRegistry } = await load();
    workspaceRepo.findWorkspace.mockResolvedValue({
      id: "w1",
      documentVersion: 3,
      document: doc({ n1: { ...source, assetId: "a1" } }),
    });
    assetRepo.find.mockResolvedValue({ id: "a1", url: "https://elsewhere.example/x.png" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "task_1" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    const tools = createParaToolRegistry({
      tenantId: "org_1",
      workspaceId: "w1",
      origin,
      contextNodeIds: ["n1"],
    });
    await tools.dispatch(
      "generate_image",
      { prompt: "night" },
      { tenantId: "org_1", threadId: "t" },
    );
    const body = JSON.parse(String((fetchSpy.mock.calls[0]?.[1] as RequestInit).body)) as {
      payload: { generator: { references: { url?: string }[] } };
    };
    expect(body.payload.generator.references[0]?.url).toBeUndefined();
  });

  it("a document conflict is retried once against the fresh version", async () => {
    const { createParaToolRegistry } = await load();
    const conflict = Object.assign(new Error("conflict"), {
      name: "DocumentVersionConflictError",
    });
    workspaceRepo.findWorkspace
      .mockResolvedValueOnce({ id: "w1", documentVersion: 3, document: doc() })
      .mockResolvedValueOnce({ id: "w1", documentVersion: 7, document: doc() });
    workspaceRepo.putDocument
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (_id, _v, d) => ({ workspace: { document: d } }));

    const tools = createParaToolRegistry({
      tenantId: "org_1",
      workspaceId: "w1",
      origin,
      contextNodeIds: [],
    });
    await tools.dispatch(
      "create_text_node",
      { text: "cold open" },
      {
        tenantId: "org_1",
        threadId: "t1",
      },
    );

    expect(workspaceRepo.putDocument).toHaveBeenCalledTimes(2);
    expect(workspaceRepo.putDocument.mock.calls[1]?.[1]).toBe(7);
  });

  it("canvas_read reports node status and the attached context, and writes nothing", async () => {
    const { createParaToolRegistry } = await load();
    workspaceRepo.findWorkspace.mockResolvedValue({
      id: "w1",
      documentVersion: 1,
      document: doc({ n1: source }),
    });
    const tools = createParaToolRegistry({
      tenantId: "org_1",
      workspaceId: "w1",
      origin,
      contextNodeIds: ["n1"],
    });
    const out = (await tools.dispatch(
      "canvas_read",
      {},
      {
        tenantId: "org_1",
        threadId: "t1",
      },
    )) as { nodes: { id: string; status: string }[]; attachedNodeIds: string[] };

    expect(out.nodes).toEqual([expect.objectContaining({ id: "n1", status: "completed" })]);
    expect(out.attachedNodeIds).toEqual(["n1"]);
    expect(workspaceRepo.putDocument).not.toHaveBeenCalled();
  });
});
