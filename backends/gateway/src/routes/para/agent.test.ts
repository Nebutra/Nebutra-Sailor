import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const agentRepo = {
  listThreads: vi.fn(),
  findThread: vi.fn(),
  createThread: vi.fn(),
  setAutonomy: vi.fn(),
  createRun: vi.fn(),
  findRun: vi.fn(),
  findRunWithThread: vi.fn(),
  listRuns: vi.fn(),
  startRun: vi.fn(),
  parkRun: vi.fn(),
  requeueRun: vi.fn(),
  finishRun: vi.fn(),
  createApproval: vi.fn(),
  findApproval: vi.fn(),
  listPendingApprovals: vi.fn(),
  decideApproval: vi.fn(),
  attachApprovalResult: vi.fn(),
};
const workspaceRepo = { findProject: vi.fn(), findWorkspace: vi.fn(), putDocument: vi.fn() };

class ApprovalAlreadyDecidedError extends Error {
  constructor(public approvalId: string) {
    super("already decided");
    this.name = "ApprovalAlreadyDecidedError";
  }
}

vi.mock("@nebutra/repositories", () => ({
  ApprovalAlreadyDecidedError,
  getParaAgentRepository: () => agentRepo,
  getParaWorkspaceRepository: () => workspaceRepo,
}));

const sent: unknown[] = [];
vi.mock("@nebutra/queue", () => ({
  createJob: (queue: string, type: string, data: unknown, options: unknown) => ({
    queue,
    type,
    data,
    options,
  }),
  getQueue: async () => ({
    enqueue: async (job: unknown) => {
      sent.push(job);
    },
  }),
}));

async function createApp() {
  const { paraAgentRoutes } = await import("./agent.js");
  const app = new OpenAPIHono();
  app.use("*", async (c, next) => {
    c.set("requestId", "req_agent_1");
    c.set("tenant", {
      userId: "user_1",
      tenantId: "org_1",
      tenantKind: "organization",
      organizationId: "org_1",
      role: "org:admin",
      plan: "PRO",
      ip: "203.0.113.5",
    });
    await next();
  });
  app.route("/", paraAgentRoutes);
  return app;
}

const now = new Date("2026-09-09T10:00:00Z");
const thread = { id: "t1", projectId: "p1", title: "colder", autonomy: "ASK", updatedAt: now };
const run = {
  id: "r1",
  threadId: "t1",
  workspaceId: "w1",
  input: "four colder variations",
  contextNodeIds: ["n1"],
  status: "QUEUED",
  error: null,
  startedAt: null,
  finishedAt: null,
  createdAt: now,
};
const approval = {
  id: "a1",
  runId: "r1",
  toolName: "generate_image",
  args: { prompt: "colder" },
  estimatedCost: 1,
  status: "PENDING",
  resultJobId: null,
  createdAt: now,
};

describe("/api/v1/para/agent", () => {
  beforeEach(() => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("AI_SERVICE_URL", "https://origin.example");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "gateway-secret");
    vi.stubEnv("SERVICE_SECRET", "service-secret");
    sent.length = 0;
    for (const fn of Object.values(agentRepo)) fn.mockReset();
    for (const fn of Object.values(workspaceRepo)) fn.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("starting a turn queues a run and hands it to the worker instead of executing it", async () => {
    agentRepo.findThread.mockResolvedValueOnce(thread);
    agentRepo.createRun.mockResolvedValueOnce(run);
    const app = await createApp();
    const res = await app.request("/threads/t1/turns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: "w1",
        input: "four colder variations",
        contextNodeIds: ["n1"],
      }),
    });

    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ id: "r1", status: "queued", workspaceId: "w1" });
    // The turn is handed to the queue, not executed here.
    expect(sent).toEqual([
      expect.objectContaining({
        queue: "para",
        type: "agent.run",
        data: { tenantId: "org_1", runId: "r1", userId: "user_1", role: "org:admin", plan: "PRO" },
      }),
    ]);
  });

  it("a run reports its pending approvals so a fresh client can rebuild the card", async () => {
    agentRepo.findRun.mockResolvedValueOnce({ ...run, status: "AWAITING_APPROVAL" });
    agentRepo.listPendingApprovals.mockResolvedValueOnce([approval]);
    const app = await createApp();
    const res = await app.request("/runs/r1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "awaiting_approval",
      pendingApprovals: [
        { id: "a1", toolName: "generate_image", estimatedCost: 1, status: "pending" },
      ],
    });
  });

  it("approving executes the parked call, records the job and resumes the run", async () => {
    agentRepo.findApproval
      .mockResolvedValueOnce(approval)
      .mockResolvedValueOnce({ ...approval, status: "APPROVED", resultJobId: "task_9" });
    agentRepo.findRun.mockResolvedValueOnce({ ...run, status: "AWAITING_APPROVAL" });
    agentRepo.decideApproval.mockResolvedValueOnce({ ...approval, status: "APPROVED" });
    agentRepo.attachApprovalResult.mockResolvedValueOnce(1);
    agentRepo.requeueRun.mockResolvedValueOnce(1);
    workspaceRepo.findWorkspace.mockResolvedValue({
      id: "w1",
      documentVersion: 3,
      document: { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } },
    });
    workspaceRepo.putDocument.mockResolvedValue({
      workspace: {
        document: { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } },
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "task_9", status: "queued" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const app = await createApp();
    const res = await app.request("/approvals/a1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });

    expect(res.status).toBe(200);
    expect(agentRepo.attachApprovalResult).toHaveBeenCalledWith("a1", "task_9");
    expect(agentRepo.requeueRun).toHaveBeenCalledWith("r1");
    expect(sent).toHaveLength(1);
    // The node was written before the job was submitted, and it carries the queued status.
    const written = workspaceRepo.putDocument.mock.calls[0]?.[2] as {
      nodes: Record<string, { type: string; status: string }>;
    };
    const node = Object.values(written.nodes)[0];
    expect(node).toMatchObject({ type: "image", status: "queued" });
  });

  it("denying closes the run and spends nothing", async () => {
    agentRepo.findApproval
      .mockResolvedValueOnce(approval)
      .mockResolvedValueOnce({ ...approval, status: "DENIED" });
    agentRepo.findRun.mockResolvedValueOnce({ ...run, status: "AWAITING_APPROVAL" });
    agentRepo.decideApproval.mockResolvedValueOnce({ ...approval, status: "DENIED" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const app = await createApp();
    const res = await app.request("/approvals/a1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve: false }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "denied" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(agentRepo.finishRun).toHaveBeenCalledWith("r1", "COMPLETED");
    expect(sent).toHaveLength(0);
  });

  it("a second click on the same approval is a conflict, not a second job", async () => {
    agentRepo.findApproval.mockResolvedValueOnce(approval);
    agentRepo.findRun.mockResolvedValueOnce(run);
    agentRepo.decideApproval.mockRejectedValueOnce(new ApprovalAlreadyDecidedError("a1"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const app = await createApp();
    const res = await app.request("/approvals/a1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve: true }),
    });

    expect(res.status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the autonomy switch is two states and round-trips lower-cased", async () => {
    agentRepo.setAutonomy.mockResolvedValueOnce({ ...thread, autonomy: "ACT" });
    const app = await createApp();
    const res = await app.request("/threads/t1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ autonomy: "act" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ autonomy: "act" });
    expect(agentRepo.setAutonomy).toHaveBeenCalledWith("t1", "ACT");
  });
});
