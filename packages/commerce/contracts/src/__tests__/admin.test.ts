import { describe, expect, it } from "vitest";
import {
  ActionRequestSchema,
  AdminManifestSchema,
  assertApplyAllowed,
  resolveContractUrl,
  roleAtLeast,
  SignalReadingSchema,
} from "../admin";

const manifest = {
  contract: "nebutra.admin/v1",
  product: "router",
  label: "Nebutra Router",
  version: "0.1.1",
  origin: "https://router.example.com",
  graph: "core",
  status: "wip",
  health: "/api/health",
  domains: [
    {
      id: "supply",
      label: "Supply",
      resources: [
        {
          id: "account",
          label: "Accounts",
          list: "/api/admin/v1/supply/accounts",
          columns: [{ key: "provider", label: "Provider" }],
          actions: ["account.relogin"],
        },
      ],
      actions: [
        {
          id: "account.relogin",
          verb: "Re-login",
          resource: "account",
          role: "platform_operator",
          url: "/api/admin/v1/supply/actions/account.relogin",
        },
        {
          id: "channel.sync",
          verb: "Sync channel",
          role: "platform_operator",
          url: "/api/admin/v1/supply/actions/channel.sync",
        },
      ],
      signals: [
        {
          id: "channel.drift",
          label: "Channel out of sync",
          severity: "warn",
          probe: "/api/admin/v1/supply/signals/channel.drift",
          action: "channel.sync",
        },
      ],
      policies: [
        {
          id: "channel.autosync",
          label: "Auto-sync",
          on: "nebutra/supply.account.changed",
          runs: "channel.sync",
        },
      ],
    },
  ],
};

describe("admin contract", () => {
  it("accepts a well-formed manifest and applies defaults", () => {
    const parsed = AdminManifestSchema.parse(manifest);
    expect(parsed.domains[0]?.actions[0]?.plan).toBe(true);
    expect(parsed.domains[0]?.resources[0]?.key).toBe("id");
  });

  it("rejects dangling references", () => {
    const bad = structuredClone(manifest) as typeof manifest;
    const signal = bad.domains[0]?.signals[0];
    if (!signal) throw new Error("fixture");
    signal.action = "does.not.exist";
    const result = AdminManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("unknown action does.not.exist");
  });

  it("requires a plan before applying a planned action", () => {
    const action = AdminManifestSchema.parse(manifest).domains[0]?.actions[1];
    if (!action) throw new Error("fixture");
    expect(
      assertApplyAllowed(action, ActionRequestSchema.parse({ mode: "apply" }))?.error.code,
    ).toBe("plan_required");
    expect(
      assertApplyAllowed(action, ActionRequestSchema.parse({ mode: "apply", planId: "p1" })),
    ).toBeNull();
    expect(assertApplyAllowed(action, ActionRequestSchema.parse({ mode: "plan" }))).toBeNull();
  });

  it("signal readings must carry probedAt", () => {
    expect(
      SignalReadingSchema.safeParse({ id: "channel.drift", status: "raised", severity: "warn" })
        .success,
    ).toBe(false);
    expect(
      SignalReadingSchema.safeParse({
        id: "channel.drift",
        status: "ok",
        severity: "warn",
        probedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("role ladder and url resolution", () => {
    expect(roleAtLeast("platform_owner", "platform_operator")).toBe(true);
    expect(roleAtLeast("platform_readonly", "platform_support")).toBe(false);
    expect(resolveContractUrl(manifest, "/api/health")).toBe(
      "https://router.example.com/api/health",
    );
  });
});
