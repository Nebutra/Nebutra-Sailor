import { beforeEach, describe, expect, it, vi } from "vitest";

const webhookHandler = vi.fn(async () => new Response("OK", { status: 200 }));

vi.mock("@nebutra/queue", () => ({
  createQStashWebhookHandler: vi.fn(() => webhookHandler),
}));

vi.mock("@/app/api/account/export/_service", () => ({
  getExportRuntime: vi.fn(async () => ({ queue: {}, uploads: {} })),
  ensureExportWorker: vi.fn(),
}));

import { ensureExportWorker, getExportRuntime } from "@/app/api/account/export/_service";

const mockedEnsure = vi.mocked(ensureExportWorker);
const mockedRuntime = vi.mocked(getExportRuntime);

async function loadRoute() {
  return import("@/app/api/queue/[queue]/[type]/route");
}

function request() {
  return new Request("https://app.example/api/queue/account-export/build", {
    method: "POST",
    body: "{}",
  });
}

describe("/api/queue/[queue]/[type]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRuntime.mockResolvedValue({ queue: {}, uploads: {} } as never);
    webhookHandler.mockResolvedValue(new Response("OK", { status: 200 }));
  });

  it("registers job handlers before dispatching the delivery", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request());

    expect(mockedEnsure).toHaveBeenCalledTimes(1);
    expect(webhookHandler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it("answers 503 without dispatching when handler registration fails", async () => {
    mockedRuntime.mockRejectedValue(new Error("no queue provider"));
    const { POST } = await loadRoute();
    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(webhookHandler).not.toHaveBeenCalled();
  });
});
