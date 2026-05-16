import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MCPClient } from "../client/mcpClient";
import { MCPServerRegistry } from "../registry/serverRegistry";
import { createContextServerHandlers } from "../server/contextServer";

describe("MCP tool registry access control", () => {
  it("executes registered local tools only when tenant and plan policies pass", async () => {
    const registry = new MCPServerRegistry();
    registry.register({
      id: "tenant-tools",
      name: "Tenant tools",
      description: "Tenant-scoped local tools",
      endpoint: "local://tenant-tools",
      transport: "local",
      allowedTenants: ["tenant_allowed"],
      tools: [
        {
          name: "summarize_context",
          description: "Summarize tenant context",
          parameters: {},
        },
        {
          name: "sync_plan_data",
          description: "Sync plan-gated data",
          parameters: {},
          allowedPlans: ["PRO", "ENTERPRISE"],
        },
      ],
      handlers: {
        summarize_context: async (args, context) => ({
          args,
          tenantId: context.tenantId,
          plan: context.plan,
        }),
        sync_plan_data: async () => ({ synced: true }),
      },
    });

    const client = new MCPClient(registry);
    const freeContext = {
      requestId: "req_1",
      tenantId: "tenant_allowed",
      plan: "FREE",
    };

    await expect(
      client.executeTool("summarize_context", { topic: "billing" }, freeContext),
    ).resolves.toMatchObject({
      success: true,
      result: { args: { topic: "billing" }, tenantId: "tenant_allowed", plan: "FREE" },
    });

    expect(client.listTools(freeContext).map((tool) => tool.name)).toEqual(["summarize_context"]);

    await expect(client.executeTool("sync_plan_data", {}, freeContext)).resolves.toMatchObject({
      success: false,
      error: "Access denied to tool: sync_plan_data",
    });

    await expect(
      client.executeTool(
        "sync_plan_data",
        {},
        { requestId: "req_2", tenantId: "tenant_allowed", plan: "PRO" },
      ),
    ).resolves.toMatchObject({
      success: true,
      result: { synced: true },
    });

    await expect(
      client.executeTool(
        "summarize_context",
        {},
        { requestId: "req_3", tenantId: "tenant_blocked", plan: "ENTERPRISE" },
      ),
    ).resolves.toMatchObject({
      success: false,
      error: "Access denied to tool: summarize_context",
    });
  });
});

describe("context server handlers", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("lists project resources and returns non-placeholder project structure", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nebutra-mcp-"));
    tempRoots.push(projectRoot);
    fs.mkdirSync(path.join(projectRoot, "apps", "web", "src", "app", "dashboard"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(projectRoot, "packages", "platform", "db", "prisma"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(projectRoot, "nebutra.config.json"), '{"features":["mcp"]}');
    fs.writeFileSync(
      path.join(projectRoot, "packages", "platform", "db", "prisma", "schema.prisma"),
      "model User { id String @id }",
    );

    const handlers = createContextServerHandlers(projectRoot);
    const resources = await handlers.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      "file:///nebutra.config.json",
    );

    const structure = await handlers.callTool({
      name: "get_project_structure",
      arguments: {},
    });
    expect(structure.content[0]?.text).toContain("apps/web/src/app/dashboard");
    expect(structure.content[0]?.text).not.toContain("Apps dir not found");

    await expect(
      handlers.readResource({ uri: "file:///prisma/schema.prisma" }),
    ).resolves.toMatchObject({
      contents: [{ text: "model User { id String @id }" }],
    });
  });
});
