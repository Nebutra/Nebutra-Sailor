import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/service-token", () => ({
  gateStaff: vi.fn(async () => ({
    ok: true,
    caller: { userId: "staff_1", role: "platform_operator" },
  })),
  err: (code: string, message: string) => ({ error: { code, message } }),
  json: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
}));

const capability = vi.hoisted(() => ({
  addSource: vi.fn(async () => ({
    auditId: "aud_1",
    runId: "run_1",
    summary: "queued",
    sourceKey: "some-source",
    discovered: 0,
  })),
  discoverSourceByKey: vi.fn(async () => ({ source: "some-source", ok: true, note: "ok" })),
  probeOneModel: vi.fn(async () => ({
    source: "some-source",
    upstreamModel: "m1",
    outcome: "success",
  })),
  probeRunStatus: vi.fn(async () => ({
    source: "some-source",
    total: 1,
    probedSinceRequest: 1,
    status: "done",
  })),
  probeSourceNow: vi.fn(
    async (): Promise<{
      auditId: string;
      runId: string;
      status: "queued" | "failed";
      summary: string;
    }> => ({
      auditId: "aud_2",
      runId: "run_2",
      status: "queued",
      summary: "queued",
    }),
  ),
  runActiveProbes: vi.fn(async () => ({ groups: 0, models: 0, runId: "run_3" })),
  runSuspendedRetry: vi.fn(async () => ({ groups: 0, models: 0, runId: "run_4" })),
  triggerDiscoveryForAllSources: vi.fn(async () => ({ sources: [] })),
}));
vi.mock("@/lib/supply/capability", () => capability);

vi.mock("@/lib/supply/clients", () => ({
  SupplyConfigError: class SupplyConfigError extends Error {},
}));
vi.mock("@/lib/supply/domain", () => ({
  applyChannelSync: vi.fn(),
  planChannelSync: vi.fn(),
}));
vi.mock("@/lib/supply/login", () => ({
  completeLogin: vi.fn(),
  isLoginProvider: vi.fn(() => false),
  startLogin: vi.fn(),
}));
vi.mock("@/lib/supply/pricing", () => ({
  applyPricePublish: vi.fn(),
  planPricePublish: vi.fn(),
  unpublishDrifted: vi.fn(),
}));
vi.mock("@/lib/supply/quota", () => ({
  runQuotaPull: vi.fn(async () => []),
  updateSourcePlanConfig: vi.fn(),
}));

const { POST } = await import("./route");

function actionRequest(id: string, body: Record<string, unknown>) {
  return new Request(`https://router.internal/api/admin/v1/supply/actions/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("supply admin actions — event-driven endpoints respond 202 and never do per-model work inline", () => {
  it("source.add returns 202 with a runId — the probing happens asynchronously, not in this request", async () => {
    const res = await POST(
      actionRequest("source.add", {
        mode: "apply",
        input: { key: "k", label: "L", baseUrl: "https://x", kind: "OPENAI_COMPATIBLE" },
      }),
      ctx("source.add"),
    );
    expect(res.status).toBe(202);
    const body = (await res.json()) as { runId: string };
    expect(body.runId).toBe("run_1");
    expect(capability.addSource).toHaveBeenCalledTimes(1);
  });

  it("source.probe returns 202 when queued successfully", async () => {
    const res = await POST(
      actionRequest("source.probe", { mode: "apply", input: { key: "cliproxyapi" } }),
      ctx("source.probe"),
    );
    expect(res.status).toBe(202);
    expect(capability.probeSourceNow).toHaveBeenCalledWith(
      "cliproxyapi",
      expect.objectContaining({ userId: "staff_1" }),
      expect.any(Request),
    );
  });

  it("source.probe returns a non-2xx status when the event could not be queued", async () => {
    capability.probeSourceNow.mockResolvedValueOnce({
      auditId: "aud_x",
      runId: "run_x",
      status: "failed",
      summary: "failed",
    });
    const res = await POST(
      actionRequest("source.probe", { mode: "apply", input: { key: "cliproxyapi" } }),
      ctx("source.probe"),
    );
    expect(res.status).toBe(503);
  });

  it("source.discover requires input.key", async () => {
    const res = await POST(
      actionRequest("source.discover", { mode: "apply", input: {} }),
      ctx("source.discover"),
    );
    expect(res.status).toBe(400);
    expect(capability.discoverSourceByKey).not.toHaveBeenCalled();
  });

  it("source.discover calls the bounded single-source primitive", async () => {
    const res = await POST(
      actionRequest("source.discover", { mode: "apply", input: { key: "cliproxyapi" } }),
      ctx("source.discover"),
    );
    expect(res.status).toBe(200);
    expect(capability.discoverSourceByKey).toHaveBeenCalledWith("cliproxyapi");
  });

  it("probe.one requires both input.key and input.upstreamModel", async () => {
    const res = await POST(
      actionRequest("probe.one", { mode: "apply", input: { key: "cliproxyapi" } }),
      ctx("probe.one"),
    );
    expect(res.status).toBe(400);
    expect(capability.probeOneModel).not.toHaveBeenCalled();
  });

  it("probe.one calls the bounded single-model primitive exactly once", async () => {
    const res = await POST(
      actionRequest("probe.one", {
        mode: "apply",
        input: { key: "cliproxyapi", upstreamModel: "gpt-image-2.5" },
      }),
      ctx("probe.one"),
    );
    expect(res.status).toBe(200);
    expect(capability.probeOneModel).toHaveBeenCalledTimes(1);
    expect(capability.probeOneModel).toHaveBeenCalledWith("cliproxyapi", "gpt-image-2.5");
  });

  it("probe.status requires input.key and a valid input.since", async () => {
    const missingSince = await POST(
      actionRequest("probe.status", { mode: "apply", input: { key: "cliproxyapi" } }),
      ctx("probe.status"),
    );
    expect(missingSince.status).toBe(400);

    const badSince = await POST(
      actionRequest("probe.status", {
        mode: "apply",
        input: { key: "cliproxyapi", since: "not-a-date" },
      }),
      ctx("probe.status"),
    );
    expect(badSince.status).toBe(400);
  });

  it("probe.status reports the queued/running/done summary", async () => {
    const res = await POST(
      actionRequest("probe.status", {
        mode: "apply",
        input: { key: "cliproxyapi", since: new Date().toISOString() },
      }),
      ctx("probe.status"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("done");
  });

  it("discovery.run / probe.idle / probe.suspended never take a sourceKey loop in this request — they call the bounded trigger functions", async () => {
    await POST(actionRequest("discovery.run", { mode: "apply", input: {} }), ctx("discovery.run"));
    await POST(actionRequest("probe.idle", { mode: "apply", input: {} }), ctx("probe.idle"));
    await POST(
      actionRequest("probe.suspended", { mode: "apply", input: {} }),
      ctx("probe.suspended"),
    );

    expect(capability.triggerDiscoveryForAllSources).toHaveBeenCalledTimes(1);
    expect(capability.runActiveProbes).toHaveBeenCalledTimes(1);
    expect(capability.runSuspendedRetry).toHaveBeenCalledTimes(1);
  });
});
