import { describe, expect, it } from "vitest";
import { toolInputJsonSchema } from "./json-schema";
import { listMcpTools } from "./mcp";
import { buildForgeOpenApi } from "./openapi";
import { ForgeRegistry } from "./registry";

const registry = ForgeRegistry.openDefault();

describe("tool input JSON Schema", () => {
  it("produces an object schema for every registered tool", () => {
    const opaque: string[] = [];
    for (const summary of registry.list()) {
      const schema = toolInputJsonSchema(registry.get(summary.id).inputSchema);
      expect(schema, summary.id).toBeTypeOf("object");
      const properties = schema.properties as Record<string, unknown> | undefined;
      if (!properties || Object.keys(properties).length === 0) opaque.push(summary.id);
    }
    // The whole point of the surface: agents must see real fields, not `{}`.
    expect(opaque, `tools with no described input fields: ${opaque.join(", ")}`).toEqual([]);
  });

  it("describes password-generate fields agents actually pass", () => {
    const schema = toolInputJsonSchema(registry.get("security/password-generate").inputSchema);
    expect(Object.keys(schema.properties as Record<string, unknown>)).toContain("length");
  });
});

describe("MCP descriptors", () => {
  it("exposes the derived schema and roots", () => {
    const tools = listMcpTools(registry);
    expect(tools.length).toBe(registry.list().length);
    const uuid = tools.find((t) => t.name === "dev__uuid");
    expect(uuid?.inputSchema).toHaveProperty("properties");
    expect(uuid?.roots).toContain("generator");
  });

  it("uses `__` separators that round-trip back to tool ids", () => {
    for (const tool of listMcpTools(registry)) {
      expect(registry.has(tool.name.replace(/__/g, "/"))).toBe(true);
    }
  });
});

describe("OpenAPI document", () => {
  const doc = buildForgeOpenApi(registry, { serverUrl: "https://forge.nebutra.com/" });
  const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;

  it("declares one invoke operation per tool", () => {
    const invokePaths = Object.keys(paths).filter((p) => p.startsWith("/api/v1/tools/invoke/"));
    expect(invokePaths.length).toBe(registry.list().length);
  });

  it("normalizes the server url and pins 3.1", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers).toEqual([{ url: "https://forge.nebutra.com" }]);
  });

  it("gives every operation a unique operationId", () => {
    const ids = Object.values(paths).flatMap((methods) =>
      Object.values(methods).map((op) => (op as { operationId?: string }).operationId),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries metering and side-effect metadata for planners", () => {
    const op = paths["/api/v1/tools/invoke/dev/uuid"]?.post as {
      "x-forge": Record<string, unknown>;
    };
    expect(op["x-forge"]).toMatchObject({ sideEffect: "pure", toolId: "dev/uuid" });
    expect(op["x-forge"].roots).toContain("generator");
  });

  it("can be narrowed to a tier", () => {
    const core = buildForgeOpenApi(registry, { serverUrl: "https://x.test", tiers: ["core"] });
    const corePaths = Object.keys(core.paths as object).filter((p) => p.includes("/invoke/"));
    expect(corePaths.length).toBeGreaterThan(0);
    expect(corePaths.length).toBeLessThan(registry.list().length);
  });
});
