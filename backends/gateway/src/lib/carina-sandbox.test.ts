import {
  CODEPLOY_CARINA_SOCKET_PATH,
  CODEPLOY_CARINA_WORKSPACE_ROOT,
  isCarinaSandbox,
  REFUSING_SANDBOX,
} from "@nebutra/agent-runtime";
import { describe, expect, it } from "vitest";
import { createGatewayCarinaBundle, getCarinaSandbox } from "./carina-sandbox.js";

describe("createGatewayCarinaBundle", () => {
  it("fails closed when co-deploy is explicitly disabled", () => {
    const bundle = createGatewayCarinaBundle({ CARINA_CODEPLOY: "0" });
    expect(bundle.carinaEnabled).toBe(false);
    expect(bundle.sandbox).toBe(REFUSING_SANDBOX);
    expect(bundle.tools.list()).toHaveLength(0);
  });

  it("defaults to same-host co-deploy (socket + workspace)", () => {
    const bundle = createGatewayCarinaBundle({}, { tenantId: "org_a", threadId: "th1" });
    expect(bundle.carinaEnabled).toBe(true);
    expect(isCarinaSandbox(bundle.sandbox)).toBe(true);
    expect(bundle.workspaceRoot).toBe(CODEPLOY_CARINA_WORKSPACE_ROOT);
    expect(bundle.tools.list().map((t) => t.definition.name)).toEqual(["command_exec"]);
  });

  it("registers command_exec when CARINA_JSONRPC_URL is set", () => {
    const bundle = createGatewayCarinaBundle(
      {
        CARINA_JSONRPC_URL: "http://127.0.0.1:7420/jsonrpc",
        CARINA_WORKSPACE_ROOT: "/var/carina/ws",
      },
      { tenantId: "org_a", threadId: "th1" },
    );
    expect(bundle.carinaEnabled).toBe(true);
    expect(bundle.workspaceRoot).toBe("/var/carina/ws");
    expect(bundle.tools.list().map((t) => t.definition.name)).toEqual(["command_exec"]);
  });

  it("resolves per-tenant workspace from map and template", () => {
    const mapped = createGatewayCarinaBundle(
      {
        CARINA_CODEPLOY: "1",
        CARINA_WORKSPACE_MAP: JSON.stringify({ org_a: "/tenants/a" }),
        CARINA_WORKSPACE_ROOT: "/fallback",
      },
      { tenantId: "org_a" },
    );
    expect(mapped.workspaceRoot).toBe("/tenants/a");

    const templated = createGatewayCarinaBundle(
      {
        CARINA_JSONRPC_URL: "http://c",
        CARINA_WORKSPACE_TEMPLATE: "/ws/{tenantId}/{threadId}",
      },
      { tenantId: "org_b", threadId: "t9" },
    );
    expect(templated.workspaceRoot).toBe("/ws/org_b/t9");
  });

  it("getCarinaSandbox returns null when co-deploy disabled", () => {
    expect(getCarinaSandbox({ CARINA_CODEPLOY: "0" })).toBeNull();
  });
});
