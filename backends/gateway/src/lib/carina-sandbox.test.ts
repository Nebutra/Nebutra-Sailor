import { describe, expect, it } from "vitest";
import { REFUSING_SANDBOX, isCarinaSandbox } from "@nebutra/agent-runtime";
import { createGatewayCarinaBundle } from "./carina-sandbox.js";

describe("createGatewayCarinaBundle", () => {
  it("fails closed with empty tools when Carina URL is unset", () => {
    const bundle = createGatewayCarinaBundle({});
    expect(bundle.carinaEnabled).toBe(false);
    expect(bundle.sandbox).toBe(REFUSING_SANDBOX);
    expect(bundle.tools.list()).toHaveLength(0);
  });

  it("registers command_exec when CARINA_JSONRPC_URL is set", () => {
    const bundle = createGatewayCarinaBundle({
      CARINA_JSONRPC_URL: "http://127.0.0.1:7420/jsonrpc",
      CARINA_WORKSPACE_ROOT: "/var/carina/ws",
    });
    expect(bundle.carinaEnabled).toBe(true);
    expect(isCarinaSandbox(bundle.sandbox)).toBe(true);
    expect(bundle.tools.list().map((t) => t.definition.name)).toEqual(["command_exec"]);
  });
});
