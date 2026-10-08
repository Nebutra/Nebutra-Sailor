import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKcqRoutes } from "./index.js";

const { logError } = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock("@nebutra/logger", () => ({ logger: { error: logError } }));

const metadata = {
  id: "mine",
  provider: "twelvedata",
  label: "My source",
  maskedKey: "••••1234",
  updatedAt: new Date().toISOString(),
};
function setup(options: { signedIn?: boolean; canManage?: boolean } = {}) {
  const store = {
    list: vi.fn(async () => [metadata]),
    find: vi.fn(async (_tenant: string, id: string) =>
      id === "mine" ? { ...metadata, key: "private-key" } : null,
    ),
    save: vi.fn(async () => metadata),
    remove: vi.fn(async () => true),
  };
  const adapter = {
    probe: vi.fn(async () => ({ status: "online", checkedAt: 1 })),
    search: vi.fn(async () => ({ items: [] })),
    bars: vi.fn(async () => ({ items: [] })),
  };
  const app = createKcqRoutes({
    resolveScope: async () =>
      options.signedIn === false
        ? null
        : { tenantId: "tenant-a", canManage: options.canManage ?? true },
    store,
    adapter,
  });
  return { app, store, adapter };
}
const mutationHeaders = {
  Origin: "https://chart.example.com",
  "Content-Type": "application/json",
  "X-KCQ-Workspace": "personal",
};
beforeEach(() => {
  vi.stubEnv("KCQ_PUBLIC_ORIGIN", "https://chart.example.com");
});
describe("KCQ credential boundary", () => {
  it("rejects anonymous callers before accessing credentials", async () => {
    const { app, store } = setup({ signedIn: false });
    expect((await app.request("/connections")).status).toBe(401);
    expect(store.list).not.toHaveBeenCalled();
  });
  it("returns masked metadata only", async () => {
    const { app, store } = setup();
    const response = await app.request("/connections");
    expect(await response.json()).toEqual({ connections: [metadata], canManage: true });
    expect(store.find).not.toHaveBeenCalled();
  });
  it("fails closed for foreign connection IDs before consuming a key", async () => {
    const { app, store, adapter } = setup();
    const response = await app.request(
      "/connections/foreign/api/v1/market-data/sources/foreign/probe",
    );
    expect(response.status).toBe(404);
    expect(store.find).toHaveBeenCalledWith("tenant-a", "foreign");
    expect(adapter.probe).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes", async () => {
    const { app, store } = setup();
    const response = await app.request("/connections", {
      method: "POST",
      headers: { ...mutationHeaders, Origin: "https://evil.example" },
      body: JSON.stringify({ label: "Test", apiKey: "12345678" }),
    });
    expect(response.status).toBe(403);
    expect(store.save).not.toHaveBeenCalled();
  });
  it("allows members to read but only owners/admins to change keys", async () => {
    const { app, store } = setup({ canManage: false });
    expect((await app.request("/connections")).status).toBe(200);
    expect(
      (await app.request("/connections/mine", { method: "DELETE", headers: mutationHeaders }))
        .status,
    ).toBe(403);
    expect(store.remove).not.toHaveBeenCalled();
    expect(
      (
        await app.request("/connections", {
          method: "POST",
          headers: mutationHeaders,
          body: JSON.stringify({ label: "Test", apiKey: "12345678" }),
        })
      ).status,
    ).toBe(403);
    expect(store.save).not.toHaveBeenCalled();
    expect(
      (
        await app.request("/connections/mine/api/v1/market-data/instruments/search", {
          method: "POST",
          headers: mutationHeaders,
          body: JSON.stringify({ sourceId: "byok-mine", keyword: "AAPL", limit: 10 }),
        })
      ).status,
    ).toBe(200);
  });
  it("accepts only the configured product origin and fails closed when missing", async () => {
    const { app, store } = setup();
    const init = {
      method: "POST",
      headers: mutationHeaders,
      body: JSON.stringify({ label: "Test", apiKey: "12345678" }),
    };
    expect((await app.request("/connections", init)).status).toBe(200);
    expect(store.save).toHaveBeenCalledOnce();
    vi.stubEnv("KCQ_PUBLIC_ORIGIN", "");
    expect((await app.request("/connections", init)).status).toBe(403);
    expect(store.save).toHaveBeenCalledOnce();
  });
  it("returns sanitized operational failures without keys", async () => {
    const { app, adapter } = setup();
    adapter.probe.mockRejectedValue(new Error("private-key"));
    const response = await app.request(
      "/connections/mine/api/v1/market-data/sources/byok-mine/probe",
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-key");
  });
  it("correlates unexpected failures without logging credentials or exception text", async () => {
    logError.mockClear();
    const { app, store } = setup();
    store.list.mockRejectedValue(
      Object.assign(new TypeError("private-key in error text"), { code: "P2002" }),
    );
    const response = await app.request("/connections");
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(logError).toHaveBeenCalledWith(
      "KCQ market request failed",
      expect.objectContaining({
        requestId: body.requestId,
        category: "TypeError",
        databaseCode: "P2002",
      }),
    );
    expect(JSON.stringify(logError.mock.calls)).not.toContain("private-key");
  });
});
