import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueuebaseWebhookHandler = vi.fn();

vi.mock("@nebutra/queue/queuebase", () => ({
  queuebaseWebhookHandler: (request: Request) => mockQueuebaseWebhookHandler(request),
}));

import { POST } from "../route";

describe("/api/webhooks/queuebase", () => {
  beforeEach(() => {
    mockQueuebaseWebhookHandler.mockReset();
  });

  it("delegates Queuebase callbacks to the queue package webhook handler", async () => {
    mockQueuebaseWebhookHandler.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const request = new Request("https://app.nebutra.com/api/webhooks/queuebase", {
      method: "POST",
      body: JSON.stringify({ jobName: "dailyCleanup", input: {} }),
    });

    const res = await POST(request);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockQueuebaseWebhookHandler).toHaveBeenCalledWith(request);
  });
});
