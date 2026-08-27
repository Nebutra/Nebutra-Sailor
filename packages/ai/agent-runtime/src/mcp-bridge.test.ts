import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { activateMcpTools, type McpServerCatalogPort } from "./mcp-bridge";
import { type McpClientLike, type ToolDefinition, ToolRegistry } from "./tools";

function def(name: string): ToolDefinition {
  return {
    name,
    description: `tool ${name}`,
    inputSchema: z.object({ q: z.string() }),
  };
}

/** Catalog fake: tenant- and plan-scoped tool listings. */
function fakeCatalog(
  byTenant: Record<
    string,
    {
      free: { server: string; definition: ToolDefinition }[];
      pro: { server: string; definition: ToolDefinition }[];
    }
  >,
): McpServerCatalogPort {
  return {
    async listTools(ctx) {
      const t = byTenant[ctx.tenantId];
      if (!t) return [];
      return ctx.plan === "pro" ? t.pro : t.free;
    },
  };
}

function fakeClient(): McpClientLike & {
  calls: { name: string; args: unknown; tenantId: string }[];
} {
  const calls: { name: string; args: unknown; tenantId: string }[] = [];
  return {
    calls,
    async executeTool(name, args, ctx) {
      calls.push({ name, args, tenantId: ctx.tenantId });
      return { ok: true, name };
    },
  };
}

describe("activateMcpTools", () => {
  it("registers tenant-scoped tools dispatchable through the registry with the right tenantId", async () => {
    const registry = new ToolRegistry();
    const catalog = fakeCatalog({
      org_a: {
        free: [{ server: "weather", definition: def("get_weather") }],
        pro: [],
      },
    });
    const client = fakeClient();

    const res = await activateMcpTools(registry, catalog, client, { tenantId: "org_a" });

    expect(res.registered).toEqual(["get_weather"]);
    expect(res.skipped).toEqual([]);
    expect(registry.list().map((r) => r.definition.name)).toEqual(["get_weather"]);

    const out = await registry.dispatch(
      "get_weather",
      { q: "NYC" },
      {
        tenantId: "org_a",
        threadId: "t1",
      },
    );
    expect(out).toEqual({ ok: true, name: "get_weather" });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]).toMatchObject({
      name: "get_weather",
      tenantId: "org_a",
      args: { q: "NYC" },
    });
  });

  it("gates by plan — low-plan tenant gets fewer tools", async () => {
    const catalog = fakeCatalog({
      org_a: {
        free: [{ server: "s", definition: def("basic") }],
        pro: [
          { server: "s", definition: def("basic") },
          { server: "s", definition: def("premium") },
        ],
      },
    });
    const client = fakeClient();

    const freeReg = new ToolRegistry();
    const free = await activateMcpTools(freeReg, catalog, client, {
      tenantId: "org_a",
      plan: "free",
    });
    expect(free.registered).toEqual(["basic"]);

    const proReg = new ToolRegistry();
    const pro = await activateMcpTools(proReg, catalog, client, { tenantId: "org_a", plan: "pro" });
    expect(pro.registered).toEqual(["basic", "premium"]);
  });

  it("skips a duplicate-name tool instead of throwing", async () => {
    const registry = new ToolRegistry();
    registry.register(def("get_weather"), async () => ({ native: true }));

    const catalog = fakeCatalog({
      org_a: {
        free: [
          { server: "weather", definition: def("get_weather") },
          { server: "weather", definition: def("get_forecast") },
        ],
        pro: [],
      },
    });

    const res = await activateMcpTools(registry, catalog, fakeClient(), { tenantId: "org_a" });

    expect(res.registered).toEqual(["get_forecast"]);
    expect(res.skipped).toEqual(["get_weather"]);
    expect(registry.list()).toHaveLength(2);
  });

  it("fails closed on empty tenantId before touching the catalog", async () => {
    const catalog = fakeCatalog({});
    const spy = vi.spyOn(catalog, "listTools");
    await expect(
      activateMcpTools(new ToolRegistry(), catalog, fakeClient(), { tenantId: "" }),
    ).rejects.toThrow(/tenantId/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("fails closed on whitespace-only tenantId", async () => {
    await expect(
      activateMcpTools(new ToolRegistry(), fakeCatalog({}), fakeClient(), { tenantId: "   " }),
    ).rejects.toThrow(/tenantId/i);
  });

  it("isolates tenants — tenant A never sees tenant B's catalog", async () => {
    const catalog = fakeCatalog({
      org_a: { free: [{ server: "s", definition: def("a_tool") }], pro: [] },
      org_b: { free: [{ server: "s", definition: def("b_tool") }], pro: [] },
    });
    const client = fakeClient();

    const regA = new ToolRegistry();
    const a = await activateMcpTools(regA, catalog, client, { tenantId: "org_a" });
    expect(a.registered).toEqual(["a_tool"]);
    expect(regA.list().map((r) => r.definition.name)).not.toContain("b_tool");

    await regA.dispatch("a_tool", { q: "x" }, { tenantId: "org_a", threadId: "t1" });
    expect(client.calls.every((c) => c.tenantId === "org_a")).toBe(true);
  });

  it("returns mcp origin so adapted tools are provenance-tagged", async () => {
    const registry = new ToolRegistry();
    const catalog = fakeCatalog({
      org_a: { free: [{ server: "weather", definition: def("get_weather") }], pro: [] },
    });
    await activateMcpTools(registry, catalog, fakeClient(), { tenantId: "org_a" });
    expect(registry.list()[0]?.origin).toEqual({ kind: "mcp", server: "weather" });
  });
});
