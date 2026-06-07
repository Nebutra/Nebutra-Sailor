import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantContext } from "../../middlewares/tenantContext.js";

const startupStoreMocks = vi.hoisted(() => ({
  getStartupProjectRecord: vi.fn(),
  saveStartupProjectRecord: vi.fn(),
}));

vi.mock("@nebutra/db", () => ({
  getTenantDb: vi.fn(() => ({})),
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: vi.fn(async () => undefined) })),
}));

vi.mock("@nebutra/metering", () => ({
  AI_TOKENS: { id: "ai_tokens" },
  getMetering: vi.fn(async () => ({
    defineMeter: vi.fn(async () => undefined),
    ingest: vi.fn(async () => undefined),
  })),
}));

vi.mock("@nebutra/startup-os/rollout", () => ({
  recordStartupOSRunRollout: vi.fn(async () => ({ threadId: "startup-os:project_1:conversation" })),
}));

vi.mock("@nebutra/startup-os/store", () => ({
  getStartupProject: vi.fn(),
  getStartupProjectRecord: startupStoreMocks.getStartupProjectRecord,
  listStartupProjects: vi.fn(),
  saveStartupCanvasLayout: vi.fn(),
  saveStartupProjectFiles: vi.fn(),
  saveStartupProjectRecord: startupStoreMocks.saveStartupProjectRecord,
}));

vi.mock("@nebutra/startup-os/conversation", () => ({
  streamStartupConversation: vi.fn(async function* streamStartupConversation(project) {
    yield { type: "delta", text: "hello", occurredAt: "2026-06-07T00:00:00.000Z" };
    yield { type: "done", summary: "updated", occurredAt: "2026-06-07T00:00:01.000Z" };
    return {
      project,
      events: [],
      files: [],
      summary: "updated",
    };
  }),
}));

import { startupOsRoutes } from "./index.js";

function createApp(tenant?: { readonly userId?: string; readonly organizationId?: string }) {
  const app = new Hono();
  if (tenant) {
    app.use("*", async (c, next) => {
      const tenantContext: TenantContext = {
        plan: "FREE",
        ip: "test",
        ...(tenant.userId ? { userId: tenant.userId } : {}),
        ...(tenant.organizationId
          ? {
              organizationId: tenant.organizationId,
              tenantId: tenant.organizationId,
              tenantKind: "organization" as const,
            }
          : {}),
      };
      c.set("tenant", tenantContext);
      await next();
    });
  }
  app.route("/api/startup-os", startupOsRoutes);
  return app;
}

describe("startupOsRoutes", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    startupStoreMocks.getStartupProjectRecord.mockReset();
    startupStoreMocks.saveStartupProjectRecord.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps Startup OS APIs behind gateway auth", async () => {
    const response = await createApp().request("/api/startup-os/projects");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  it("keeps context AI-fill honest when no private provider key is configured", async () => {
    const response = await createApp({ userId: "user_1", organizationId: "org_1" }).request(
      "/api/startup-os/projects/project_1/context",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layerId: "L1", fieldKey: "name" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ needsProvider: true });
  });

  it("keeps run execution on gateway and blocks execution without a private provider key", async () => {
    const response = await createApp({ userId: "user_1", organizationId: "org_1" }).request(
      "/api/startup-os/projects/project_1/runs/run_1/execute",
      { method: "POST" },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("requires a private provider key"),
    });
  });

  it("streams Startup OS conversation events from the gateway boundary", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const project = {
      id: "project_1",
      companyContext: {},
    };
    startupStoreMocks.getStartupProjectRecord.mockResolvedValue({
      project,
      files: [],
      snapshots: [],
    });
    startupStoreMocks.saveStartupProjectRecord.mockResolvedValue({
      project,
      files: [],
      snapshots: [],
    });

    const response = await createApp({ userId: "user_1", organizationId: "org_1" }).request(
      "/api/startup-os/projects/project_1/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: "Ship the next artifact." }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("event: turn");
    expect(body).toContain("event: delta");
    expect(body).toContain("hello");
    expect(body).toContain("event: done");
    expect(body).toContain("event: end");
    expect(startupStoreMocks.saveStartupProjectRecord).toHaveBeenCalled();
  });
});
