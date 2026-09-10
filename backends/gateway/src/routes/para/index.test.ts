import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  listProjects: vi.fn(),
  findProject: vi.fn(),
  createProject: vi.fn(),
  listWorkspaces: vi.fn(),
  findWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  putDocument: vi.fn(),
};
const assets = { list: vi.fn(), create: vi.fn() };

class DocumentVersionConflictError extends Error {
  constructor(
    public workspaceId: string,
    public currentVersion: number,
    public current: unknown,
  ) {
    super("conflict");
    this.name = "DocumentVersionConflictError";
  }
}

vi.mock("@nebutra/repositories", () => ({
  DocumentVersionConflictError,
  getParaWorkspaceRepository: () => repo,
  getParaAssetRepository: () => assets,
}));

async function createApp() {
  const { paraRoutes } = await import("./index.js");
  const app = new OpenAPIHono();
  app.use("*", async (c, next) => {
    c.set("requestId", "req_para_1");
    const tenant = {
      userId: "user_1",
      tenantId: "org_1",
      tenantKind: "organization",
      organizationId: "org_1",
      role: "org:admin",
      plan: "PRO",
      ip: "203.0.113.5",
    };
    c.set("tenant", tenant);
    // requirePermission reads this; tenantContextMiddleware derives it from the tenant in
    // production. Inlined rather than imported because that module pulls in the auth stack.
    c.set("user", {
      userId: "user_1",
      tenantId: "org_1",
      roles: ["admin"],
      attributes: { plan: "PRO" },
    });
    await next();
  });
  app.route("/", paraRoutes);
  return app;
}

const now = new Date("2026-09-08T10:00:00Z");
const ws = {
  id: "w1",
  projectId: "p1",
  name: "EP01",
  documentVersion: 3,
  updatedAt: now,
  document: { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } },
};

describe("/api/v1/para", () => {
  beforeEach(() => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("AI_SERVICE_URL", "https://origin.example");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "gateway-secret");
    vi.stubEnv("SERVICE_SECRET", "service-secret");
    for (const fn of Object.values(repo)) fn.mockReset();
    for (const fn of Object.values(assets)) fn.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates a workspace with zero steps and returns its version", async () => {
    repo.findProject.mockResolvedValueOnce({ id: "p1", name: "Last Animal", updatedAt: now });
    repo.createWorkspace.mockResolvedValueOnce({ ...ws, documentVersion: 1 });
    const app = await createApp();
    const res = await app.request("/projects/p1/workspaces", { method: "POST" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: "w1", projectId: "p1", documentVersion: 1 });
    expect(repo.createWorkspace).toHaveBeenCalledWith("p1", undefined);
  });

  it("PUT document with a matching If-Match saves and bumps ETag", async () => {
    repo.putDocument.mockResolvedValueOnce({ workspace: { ...ws, documentVersion: 4 } });
    const app = await createApp();
    const res = await app.request("/workspaces/w1/document", {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": '"3"' },
      body: JSON.stringify(ws.document),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"4"');
    expect(repo.putDocument).toHaveBeenCalledWith("w1", 3, expect.objectContaining({ version: 2 }));
  });

  it("PUT document with a stale If-Match answers 409 with the server copy", async () => {
    repo.putDocument.mockRejectedValueOnce(
      new DocumentVersionConflictError("w1", 5, { version: 2, nodes: { s: 1 } }),
    );
    const app = await createApp();
    const res = await app.request("/workspaces/w1/document", {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": "3" },
      body: JSON.stringify(ws.document),
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ documentVersion: 5, document: { nodes: { s: 1 } } });
  });

  it("creates a job through the origin task envelope and maps the status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "task_1",
          type: "para.generate",
          status: "queued",
          progress: 0,
          payload: { workspaceId: "w1", nodeId: "n9" },
          metadata: { queue_position: 2 },
          started_at: null,
          completed_at: null,
          result: null,
          error: null,
        }),
        { status: 202, headers: { "content-type": "application/json" } },
      ),
    );
    const app = await createApp();
    const res = await app.request("/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: "w1",
        nodeId: "n9",
        generator: { mode: "image", prompt: "colder" },
      }),
    });
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({
      id: "task_1",
      nodeId: "n9",
      workspaceId: "w1",
      status: "queued",
      queuePosition: 2,
      progress: 0,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://origin.example/api/v1/tasks/");
    const sent = JSON.parse(String(init.body)) as { type: string; payload: { nodeId: string } };
    expect(sent.type).toBe("para.generate");
    expect(sent.payload.nodeId).toBe("n9");
    expect((init.headers as Record<string, string>)["x-organization-id"]).toBe("org_1");
  });

  it("origin rejection is a 502 with no job", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("insufficient credits", { status: 402 }),
    );
    const app = await createApp();
    const res = await app.request("/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "w1", nodeId: "n9", generator: { mode: "image" } }),
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "insufficient credits" });
  });

  it("maps cancelled and failed origin tasks to a terminal error payload", async () => {
    const { taskToJob } = await import("./index.js");
    expect(
      taskToJob({
        id: "t",
        status: "cancelled",
        progress: 40,
        payload: { nodeId: "n", workspaceId: "w" },
      }),
    ).toMatchObject({
      status: "failed",
      error: { type: "cancelled", retryable: true },
      progress: 0.4,
    });
    expect(
      taskToJob({
        id: "t",
        status: "failed",
        error: { code: "model_timeout", message: "took too long" },
      }),
    ).toMatchObject({
      status: "failed",
      error: { type: "model_timeout", message: "took too long" },
    });
    expect(
      taskToJob({
        id: "t",
        status: "succeeded",
        progress: 100,
        completed_at: "2026-09-08T10:00:00Z",
      }),
    ).toMatchObject({ status: "completed", progress: 1, finishedAt: "2026-09-08T10:00:00Z" });
  });

  it("maps SSE task frames to PARA jobs so the browser never sees a task envelope", async () => {
    const { mapTaskEventStream } = await import("./index.js");
    const frames = [
      `event: task\ndata: ${JSON.stringify({ id: "t1", status: "queued", progress: 0, payload: { nodeId: "n1", workspaceId: "w1" }, metadata: { queue_position: 3 } })}\n\n`,
      `event: task\ndata: ${JSON.stringify({ id: "t1", status: "running", progress: 40, payload: { nodeId: "n1", workspaceId: "w1" } })}\n\n`,
      'event: error\ndata: {"detail":"noted"}\n\n',
      `event: task\ndata: ${JSON.stringify({ id: "t1", status: "succeeded", progress: 100, payload: { nodeId: "n1", workspaceId: "w1" }, result: { assets: [{ url: "https://cdn/x.png" }] }, completed_at: "2026-09-09T00:00:00Z" })}\n\n`,
    ].join("");

    // Split mid-frame to prove the transform reassembles across chunk boundaries.
    const cut = Math.floor(frames.length / 3);
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(frames.slice(0, cut)));
        controller.enqueue(encoder.encode(frames.slice(cut)));
        controller.close();
      },
    });

    const out: string[] = [];
    const reader = mapTaskEventStream(source).getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out.push(decoder.decode(value));
    }
    const events = out
      .join("")
      .split("\n\n")
      .filter(Boolean)
      .map((frame) => frame.split("\ndata: "));

    expect(events).toHaveLength(4);
    expect(JSON.parse(events[0]?.[1] as string)).toMatchObject({
      status: "queued",
      nodeId: "n1",
      queuePosition: 3,
      progress: 0,
    });
    expect(JSON.parse(events[1]?.[1] as string)).toMatchObject({
      status: "running",
      progress: 0.4,
    });
    // Non-task frames survive untouched.
    expect(events[2]).toEqual(["event: error", '{"detail":"noted"}']);
    expect(JSON.parse(events[3]?.[1] as string)).toMatchObject({
      status: "completed",
      progress: 1,
      result: { assets: [{ url: "https://cdn/x.png" }] },
    });
  });

  it("lists assets with lower-cased enums", async () => {
    assets.list.mockResolvedValueOnce([
      {
        id: "a1",
        type: "IMAGE",
        origin: "GENERATED",
        scope: "ACCOUNT",
        url: "https://cdn/x.png",
        label: "A1",
        aspect: "16:9",
        jobId: "t1",
        workspaceId: "w1",
        projectId: "p1",
        favorite: false,
        createdAt: now,
      },
    ]);
    const app = await createApp();
    const res = await app.request("/assets?origin=generated&workspaceId=w1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        expect.objectContaining({
          type: "image",
          origin: "generated",
          scope: "account",
          jobId: "t1",
        }),
      ],
    });
    expect(assets.list).toHaveBeenCalledWith({ origin: "GENERATED", workspaceId: "w1" });
  });
});
