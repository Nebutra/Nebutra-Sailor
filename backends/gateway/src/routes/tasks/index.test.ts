import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function createApp() {
  const { taskRoutes } = await import("./index.js");
  const app = new OpenAPIHono();
  app.use("*", async (c, next) => {
    c.set("requestId", "req_task_1");
    c.set("tenant", {
      userId: "user_1",
      tenantId: "org_1",
      tenantKind: "organization",
      organizationId: "org_1",
      role: "org:admin",
      plan: "PRO",
      ip: "198.51.100.9",
    });
    await next();
  });
  app.route("/", taskRoutes);
  return app;
}

describe("task origin proxy", () => {
  beforeEach(() => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("AI_SERVICE_URL", "https://origin.example");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "gateway-secret");
    vi.stubEnv("SERVICE_SECRET", "service-secret");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates tasks through the ECS origin with signed tenant context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "task_1",
          type: "document.parse",
          status: "queued",
          progress: 0,
        }),
        { headers: { "content-type": "application/json" }, status: 202 },
      ),
    );
    const app = await createApp();

    const response = await app.request("/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.8",
      },
      body: JSON.stringify({
        type: "document.parse",
        payload: { uploadId: "upload_1" },
      }),
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ id: "task_1", status: "queued" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://origin.example/api/v1/tasks/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-nebutra-client-ip": "203.0.113.8",
          "x-nebutra-gateway-secret": "gateway-secret",
          "x-nebutra-request-id": "req_task_1",
          "x-nebutra-tenant-id": "org_1",
          "x-organization-id": "org_1",
          "x-plan": "PRO",
          "x-role": "org:admin",
          "x-service-token": expect.stringMatching(/^eyJ/),
          "x-user-id": "user_1",
        }),
      }),
    );
  });

  it("streams task events without buffering the origin body", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: task\ndata: {"progress":50}\n\n'));
        controller.close();
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, {
        headers: { "content-type": "text/event-stream" },
        status: 200,
      }),
    );
    const app = await createApp();

    const response = await app.request("/task_1/events");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toContain('"progress":50');
  });

  it("forwards task cancellation to the ECS origin", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "task_1", status: "cancelled" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const app = await createApp();

    const response = await app.request("/task_1/cancel", { method: "POST" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "cancelled" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://origin.example/api/v1/tasks/task_1/cancel");
  });
});
