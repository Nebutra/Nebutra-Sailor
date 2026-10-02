import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyServiceToken = vi.hoisted(() => vi.fn());
vi.mock("@nebutra/auth", () => ({ verifyServiceToken }));

const send = vi.hoisted(() => vi.fn());
vi.mock("../../inngest/client.js", () => ({ inngest: { send } }));

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { supplyEventsRoutes } = await import("./supply-events.js");

beforeEach(() => {
  verifyServiceToken.mockReset();
  send.mockReset();
});

describe("POST /events — auth", () => {
  it("rejects a request with no service token", async () => {
    verifyServiceToken.mockResolvedValue(false);
    const res = await supplyEventsRoutes.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "supply/bootstrap", data: {} }),
    });
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a request whose token fails verification", async () => {
    verifyServiceToken.mockResolvedValue(false);
    const res = await supplyEventsRoutes.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-token": "bad" },
      body: JSON.stringify({ name: "supply/bootstrap", data: {} }),
    });
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("POST /events — validation", () => {
  it("rejects an unknown event name", async () => {
    verifyServiceToken.mockResolvedValue(true);
    const res = await supplyEventsRoutes.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-token": "good" },
      body: JSON.stringify({ name: "not/a/supply/event", data: {} }),
    });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("POST /events — success", () => {
  it("sends a known supply/* event to Inngest and returns 202 with its ids", async () => {
    verifyServiceToken.mockResolvedValue(true);
    send.mockResolvedValue({ ids: ["evt_123"] });

    const res = await supplyEventsRoutes.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-token": "good" },
      body: JSON.stringify({
        name: "supply/source.changed",
        data: { sourceKey: "cliproxyapi", reason: "added" },
      }),
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { ok: boolean; ids: string[] };
    expect(body.ok).toBe(true);
    expect(body.ids).toEqual(["evt_123"]);
    expect(send).toHaveBeenCalledWith({
      name: "supply/source.changed",
      data: { sourceKey: "cliproxyapi", reason: "added" },
    });
  });

  it("returns 502 when Inngest's send fails, without throwing", async () => {
    verifyServiceToken.mockResolvedValue(true);
    send.mockRejectedValue(new Error("network down"));

    const res = await supplyEventsRoutes.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-token": "good" },
      body: JSON.stringify({ name: "supply/bootstrap", data: { sourceKeys: [] } }),
    });

    expect(res.status).toBe(502);
  });
});
