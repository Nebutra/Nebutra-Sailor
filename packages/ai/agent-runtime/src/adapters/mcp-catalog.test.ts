import type { MCPContext, ToolExecutionResult } from "@nebutra/mcp";
import { MCPServerRegistry } from "@nebutra/mcp";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { activateMcpTools, type McpServerCatalogPort } from "../mcp-bridge";
import { ToolRegistry } from "../tools";

import { createMcpClientPort, createMcpServerCatalog } from "./mcp-catalog.js";

/**
 * Build a fresh, isolated registry seeded with two servers gated by plan and
 * tenant. No network — `local` transport with in-process handlers.
 */
function seedRegistry(): MCPServerRegistry {
  const registry = new MCPServerRegistry();

  registry.register({
    id: "weather",
    name: "Weather",
    description: "Weather tools",
    endpoint: "local://weather",
    transport: "local",
    tools: [
      {
        name: "forecast",
        description: "Get a forecast",
        parameters: {
          city: { type: "string", description: "City name", required: true },
          days: { type: "number", description: "Day count" },
        },
      },
      {
        name: "alerts",
        description: "Severe weather alerts (pro only)",
        allowedPlans: ["pro", "enterprise"],
      },
    ],
    handlers: {
      forecast: (args) => ({ ok: true, echo: args }),
      alerts: () => ({ ok: true, alerts: [] }),
    },
  });

  registry.register({
    id: "acme-private",
    name: "Acme Private",
    description: "Tenant-scoped server",
    endpoint: "local://acme",
    transport: "local",
    allowedTenants: ["tenant-acme"],
    tools: [{ name: "acme_secret", description: "Acme-only tool" }],
    handlers: { acme_secret: () => ({ ok: true }) },
  });

  return registry;
}

describe("createMcpServerCatalog", () => {
  it("fails closed on empty tenantId before touching the registry", async () => {
    const registry = new MCPServerRegistry();
    const spy = vi.spyOn(registry, "getAccessibleTools");
    const catalog = createMcpServerCatalog(registry);

    await expect(catalog.listTools({ tenantId: "" })).rejects.toThrow();
    await expect(catalog.listTools({ tenantId: "   " })).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("plan-gates: a free tenant sees fewer tools than a pro tenant", async () => {
    const catalog = createMcpServerCatalog(seedRegistry());

    const free = await catalog.listTools({ tenantId: "tenant-1", plan: "free" });
    const pro = await catalog.listTools({ tenantId: "tenant-1", plan: "pro" });

    const freeNames = free.map((e) => e.definition.name).sort();
    const proNames = pro.map((e) => e.definition.name).sort();

    expect(freeNames).toEqual(["forecast"]);
    expect(proNames).toEqual(["alerts", "forecast"]);
    expect(pro.length).toBeGreaterThan(free.length);
  });

  it("isolates tenants: only the allowed tenant sees its private server", async () => {
    const catalog = createMcpServerCatalog(seedRegistry());

    const other = await catalog.listTools({ tenantId: "tenant-other", plan: "enterprise" });
    const acme = await catalog.listTools({ tenantId: "tenant-acme", plan: "enterprise" });

    expect(other.map((e) => e.definition.name)).not.toContain("acme_secret");
    expect(acme.map((e) => e.definition.name)).toContain("acme_secret");
  });

  it("produces a usable ToolDefinition even for a schema-less MCP tool", async () => {
    const catalog = createMcpServerCatalog(seedRegistry());
    const pro = await catalog.listTools({ tenantId: "tenant-1", plan: "pro" });

    const alerts = pro.find((e) => e.definition.name === "alerts");
    expect(alerts).toBeDefined();
    // No `parameters` → permissive object schema, never throws on parse.
    expect(() => alerts?.definition.inputSchema.parse({})).not.toThrow();
    expect(() => alerts?.definition.inputSchema.parse({ anything: 1 })).not.toThrow();
    expect(alerts?.server).toBe("weather");
  });

  it("derives a Zod schema from MCP `parameters`", async () => {
    const catalog = createMcpServerCatalog(seedRegistry());
    const free = await catalog.listTools({ tenantId: "tenant-1", plan: "free" });
    const forecast = free.find((e) => e.definition.name === "forecast");

    expect(forecast).toBeDefined();
    if (!forecast) throw new Error("forecast tool missing");
    const schema = forecast.definition.inputSchema as z.ZodType;
    // Required `city` enforced.
    expect(() => schema.parse({})).toThrow();
    expect(schema.parse({ city: "NYC" })).toMatchObject({ city: "NYC" });
    expect(schema.parse({ city: "NYC", days: 3 })).toMatchObject({ days: 3 });
  });
});

describe("createMcpClientPort", () => {
  it("forwards tenantId into the MCPContext and unwraps the result envelope", async () => {
    let seen: MCPContext | undefined;
    const fake = {
      async executeTool(
        _name: string,
        _args: Record<string, unknown>,
        ctx: MCPContext,
      ): Promise<ToolExecutionResult> {
        seen = ctx;
        return { success: true, result: { value: 42 }, duration: 1 };
      },
    };

    const port = createMcpClientPort(fake);
    const out = await port.executeTool(
      "forecast",
      { city: "NYC" },
      {
        requestId: "req-1",
        tenantId: "tenant-xyz",
      },
    );

    expect(out).toEqual({ value: 42 });
    expect(seen?.tenantId).toBe("tenant-xyz");
    expect(seen?.requestId).toBe("req-1");
  });

  it("fails closed when the MCP client reports failure", async () => {
    const fake = {
      async executeTool(): Promise<ToolExecutionResult> {
        return { success: false, error: "Access denied", duration: 1 };
      },
    };
    const port = createMcpClientPort(fake);

    await expect(port.executeTool("x", {}, { requestId: "r", tenantId: "t" })).rejects.toThrow(
      /Access denied/,
    );
  });

  it("rejects an empty tenantId at the client boundary (fail-closed)", async () => {
    const fake = {
      executeTool: vi.fn(
        async (): Promise<ToolExecutionResult> => ({
          success: true,
          result: null,
          duration: 0,
        }),
      ),
    };
    const port = createMcpClientPort(fake);

    await expect(port.executeTool("x", {}, { requestId: "r", tenantId: "" })).rejects.toThrow();
    expect(fake.executeTool).not.toHaveBeenCalled();
  });
});

describe("composition with agent-runtime activateMcpTools", () => {
  it("registers catalog tools into a ToolRegistry and dispatches through the client port", async () => {
    const catalog: McpServerCatalogPort = createMcpServerCatalog(seedRegistry());
    const calls: { name: string; ctx: MCPContext }[] = [];
    const client = createMcpClientPort({
      async executeTool(
        name: string,
        args: Record<string, unknown>,
        ctx: MCPContext,
      ): Promise<ToolExecutionResult> {
        calls.push({ name, ctx });
        return { success: true, result: { echoed: args }, duration: 1 };
      },
    });

    const registry = new ToolRegistry();
    const result = await activateMcpTools(registry, catalog, client, {
      tenantId: "tenant-1",
      plan: "pro",
    });

    expect([...result.registered].sort()).toEqual(["alerts", "forecast"]);
    expect(result.skipped).toEqual([]);

    const out = await registry.dispatch(
      "forecast",
      { city: "NYC" },
      { tenantId: "tenant-1", threadId: "thread-1" },
    );

    expect(out).toEqual({ echoed: { city: "NYC" } });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.ctx.tenantId).toBe("tenant-1");
  });
});
