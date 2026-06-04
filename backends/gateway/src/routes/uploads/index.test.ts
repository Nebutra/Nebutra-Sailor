import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function createApp() {
  const { uploadRoutes } = await import("./index.js");
  const app = new OpenAPIHono();
  app.use("*", async (c, next) => {
    c.set("requestId", "req_upload_1");
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
  app.route("/", uploadRoutes);
  return app;
}

describe("upload origin proxy", () => {
  beforeEach(() => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("AI_SERVICE_URL", "https://origin.example");
    vi.stubEnv("GATEWAY_SHARED_SECRET", "gateway-secret");
    vi.stubEnv("SERVICE_SECRET", "service-secret-at-least-32-bytes");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates presigned uploads through the ECS origin with signed tenant context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "upload_1",
          status: "pending",
          provider: "local",
          presigned_upload: { method: "PUT", url: "https://uploads.test/upload_1" },
        }),
        { headers: { "content-type": "application/json" }, status: 201 },
      ),
    );
    const app = await createApp();

    const response = await app.request("/presign", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.8",
      },
      body: JSON.stringify({
        filename: "report.pdf",
        content_type: "application/pdf",
        size: 1024,
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: "upload_1", status: "pending" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://origin.example/api/v1/uploads/presign",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-nebutra-client-ip": "203.0.113.8",
          "x-nebutra-gateway-secret": "gateway-secret",
          "x-nebutra-request-id": "req_upload_1",
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

  it("forwards upload completion to the ECS origin", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "upload_1", status: "completed" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const app = await createApp();

    const response = await app.request("/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ upload_id: "upload_1", size: 1024 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "completed" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://origin.example/api/v1/uploads/complete");
  });

  it("gets upload metadata from the ECS origin", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "upload_1", status: "completed" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const app = await createApp();

    const response = await app.request("/upload_1");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "upload_1" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://origin.example/api/v1/uploads/upload_1");
  });
});
