import { describe, expect, it, vi } from "vitest";
import { createKcqRoutes } from "./index.js";

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
  Origin: "https://kcq.nebutra.com",
  "Content-Type": "application/json",
  "X-KCQ-Workspace": "personal",
};
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
});
