/** Tenant headers, fixed transports and key redaction in the browser adapter. */
import { marketDataProviderRegistry } from "@363045841yyt/klinechart-core/market-data";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMarketConnections } from "./market-connections";

const context = {
  user: { id: "user", name: "User", email: "user@example.test", image: null },
  activeWorkspaceId: "workspace-a",
  workspaces: [{ id: "workspace-a", name: "Team", slug: "team", image: null }],
};
const row = {
  id: "connection-a",
  provider: "twelvedata",
  label: "My source",
  maskedKey: "••••1234",
  updatedAt: "2026-10-08",
};
afterEach(() => {
  marketDataProviderRegistry.unregister("byok-connection-a");
});
describe("hosted market connections", () => {
  it("registers dynamic sources and fixes the request destination despite local overrides", async () => {
    const upstream = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/connections")
        ? Response.json({ connections: [row], canManage: true })
        : Response.json({ data: { items: [] }, requestId: "test" }),
    );
    const state = createMarketConnections(context, "https://kcq.nebutra.com", upstream);
    expect(await state.initialize()).toBe(true);
    const provider = marketDataProviderRegistry.getRequired("byok-connection-a");
    expect(provider.source.endpointEditable).toBe(false);
    marketDataProviderRegistry.setConfig(provider.source.id, { baseUrl: "https://evil.example" });
    await provider.catalog?.search({ keyword: "AAPL", limit: 1 });
    const call = upstream.mock.calls.at(-1);
    if (!call) throw new Error("missing transport request");
    expect(String(call[0])).toContain(
      "https://kcq.nebutra.com/market/byok/connections/connection-a/",
    );
    expect(new Headers(call[1]?.headers).get("X-KCQ-Workspace")).toBe("workspace-a");
    expect(call[1]?.credentials).toBe("same-origin");
  });
  it("sends a key only in a bounded write body and retains masked metadata", async () => {
    const upstream = vi.fn<typeof fetch>(async (_input, init) =>
      init?.method === "POST"
        ? Response.json(row)
        : Response.json({ connections: [row], canManage: true }),
    );
    const state = createMarketConnections(context, "https://kcq.nebutra.com", upstream);
    await state.save("My source", "private-key-1234");
    expect(upstream.mock.calls[0]?.[1]?.body).toContain("private-key-1234");
    expect(JSON.stringify(state.connections.value)).not.toContain("private-key-1234");
    expect(state.connections.value).toEqual([row]);
  });
  it("keeps bootstrap errors visible without registering fake connections", async () => {
    const state = createMarketConnections(context, "https://kcq.nebutra.com", async () =>
      Response.json({ error: { message: "Unavailable" } }, { status: 503 }),
    );
    expect(await state.initialize()).toBe(false);
    expect(state.error.value).toBe("Unavailable");
    expect(state.connections.value).toEqual([]);
  });
  it("never loads private connections for a signed-out visitor", async () => {
    const upstream = vi.fn<typeof fetch>();
    await createMarketConnections(null, "https://kcq.nebutra.com", upstream).initialize();
    expect(upstream).not.toHaveBeenCalled();
  });
});
