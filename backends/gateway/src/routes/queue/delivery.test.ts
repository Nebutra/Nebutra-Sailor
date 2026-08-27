import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { qstashHandler } = vi.hoisted(() => ({
  qstashHandler: vi.fn<(request: Request) => Promise<Response>>(
    async () => new Response("OK", { status: 200 }),
  ),
}));

vi.mock("@nebutra/queue", () => ({
  createQStashWebhookHandler: () => qstashHandler,
}));

import { queueDeliveryRoutes } from "./delivery.js";

describe("queueDeliveryRoutes", () => {
  beforeEach(() => {
    qstashHandler.mockClear();
  });

  it("mounts QStash delivery endpoint and passes the raw request to the provider handler", async () => {
    const app = new OpenAPIHono();
    app.route("/api/queue", queueDeliveryRoutes);

    const res = await app.request("/api/queue/email/send", {
      method: "POST",
      body: JSON.stringify({
        id: "job_1",
        queue: "email",
        type: "send",
        data: {},
        createdAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
    expect(qstashHandler).toHaveBeenCalledTimes(1);
    expect(qstashHandler.mock.calls[0]?.[0]).toBeInstanceOf(Request);
  });
});
