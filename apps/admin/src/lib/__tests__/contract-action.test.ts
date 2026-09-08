import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const staff = { userId: "u1", email: "ops@example.com", role: "platform_readonly" };
const requireStaff = vi.fn(async () => staff);
vi.mock("../staff", () => ({
  requireStaff: () => requireStaff(),
  StaffAccessError: class extends Error {},
}));

const manifest = {
  contract: "nebutra.admin/v1",
  product: "router",
  label: "Nebutra Router",
  version: "0.1.1",
  origin: "https://router.example.com",
  graph: "labs",
  status: "wip",
  health: "/api/health",
  domains: [
    {
      id: "supply",
      label: "Supply",
      resources: [],
      signals: [],
      policies: [],
      actions: [
        {
          id: "channel.sync",
          verb: "Sync channel",
          role: "platform_operator",
          url: "/api/admin/v1/supply/actions/channel.sync",
          plan: true,
          destructive: false,
        },
      ],
    },
  ],
};
const planAction = vi.fn(async () => ({
  planId: "p1",
  summary: "add 2 models",
  diff: [],
  affected: [],
  warnings: [],
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
}));
const applyAction = vi.fn(async () => ({ auditId: "a1", summary: "synced" }));
vi.mock("../contract-client", () => ({
  loadManifest: vi.fn(async () => manifest),
  planAction: (...args: unknown[]) => planAction(...(args as [])),
  applyAction: (...args: unknown[]) => applyAction(...(args as [])),
  ContractError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly status?: number,
    ) {
      super(message);
    }
  },
}));

const { handleContractAction } = await import("../contract-action");

describe("contract action route", () => {
  beforeEach(() => {
    planAction.mockClear();
    applyAction.mockClear();
    staff.role = "platform_readonly";
  });

  it("refuses a role below the action's role before the product is called", async () => {
    const res = await handleContractAction({
      serviceId: "@nebutra/router",
      actionId: "channel.sync",
      mode: "plan",
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "forbidden" } });
    expect(planAction).not.toHaveBeenCalled();
    expect(applyAction).not.toHaveBeenCalled();
  });

  it("plans for an operator, signed with the caller's role", async () => {
    staff.role = "platform_operator";
    const res = await handleContractAction({
      serviceId: "@nebutra/router",
      actionId: "channel.sync",
      mode: "plan",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ planId: "p1" });
    expect(planAction).toHaveBeenCalledWith(
      manifest,
      "/api/admin/v1/supply/actions/channel.sync",
      {},
      { userId: "u1", role: "platform_operator" },
    );
  });

  it("refuses an apply without a plan for a planned action", async () => {
    staff.role = "platform_owner";
    const res = await handleContractAction({
      serviceId: "@nebutra/router",
      actionId: "channel.sync",
      mode: "apply",
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: "plan_required" } });
    expect(applyAction).not.toHaveBeenCalled();
  });

  it("404s an action the manifest does not declare", async () => {
    staff.role = "platform_owner";
    const res = await handleContractAction({
      serviceId: "@nebutra/router",
      actionId: "tenant.suspend",
      mode: "plan",
    });
    expect(res.status).toBe(404);
  });
});
