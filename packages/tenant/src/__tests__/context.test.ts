import { describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn() },
}));

const {
  getCurrentTenant,
  getCurrentTenantId,
  getTenantIdOrNull,
  getTenantOrNull,
  requireTenant,
  runWithTenant,
} = await import("../context.js");
const { TenantRequiredError } = await import("../types.js");

describe("runWithTenant / getCurrentTenant", () => {
  it("sets and retrieves tenant context within async scope", async () => {
    const result = await runWithTenant({ id: "org_1" }, () => {
      const tenant = getCurrentTenant();
      return tenant.id;
    });
    expect(result).toBe("org_1");
  });

  it("supports async callbacks", async () => {
    const result = await runWithTenant({ id: "org_2" }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      return getCurrentTenantId();
    });
    expect(result).toBe("org_2");
  });

  it("isolates concurrent tenants", async () => {
    const results = await Promise.all([
      runWithTenant({ id: "org_A" }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return getCurrentTenantId();
      }),
      runWithTenant({ id: "org_B" }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return getCurrentTenantId();
      }),
    ]);
    expect(results).toEqual(["org_A", "org_B"]);
  });

  it("propagates tenant context across nested async calls", async () => {
    const result = await runWithTenant({ id: "org_nested" }, async () => {
      const fn = async () => getCurrentTenantId();
      return fn();
    });
    expect(result).toBe("org_nested");
  });
});

describe("getCurrentTenant", () => {
  it("throws TenantRequiredError when no context is set", () => {
    expect(() => getCurrentTenant()).toThrow(TenantRequiredError);
  });
});

describe("getTenantOrNull", () => {
  it("returns null when no context is set", () => {
    expect(getTenantOrNull()).toBeNull();
  });

  it("returns context when set", async () => {
    await runWithTenant({ id: "org_3" }, () => {
      expect(getTenantOrNull()?.id).toBe("org_3");
    });
  });
});

describe("getCurrentTenantId", () => {
  it("throws when no context", () => {
    expect(() => getCurrentTenantId()).toThrow(TenantRequiredError);
  });
});

describe("getTenantIdOrNull", () => {
  it("returns null when no context", () => {
    expect(getTenantIdOrNull()).toBeNull();
  });

  it("returns id when context is set", async () => {
    await runWithTenant({ id: "org_4" }, () => {
      expect(getTenantIdOrNull()).toBe("org_4");
    });
  });
});

describe("requireTenant", () => {
  it("does not throw for valid tenant", () => {
    expect(() => requireTenant({ id: "org_5" })).not.toThrow();
  });

  it("throws TenantRequiredError for null", () => {
    expect(() => requireTenant(null)).toThrow(TenantRequiredError);
  });

  it("throws TenantRequiredError for undefined", () => {
    expect(() => requireTenant(undefined)).toThrow(TenantRequiredError);
  });

  it("includes context in error message", () => {
    expect(() => requireTenant(null, "DELETE /api/projects/:id")).toThrow(
      "Tenant context required for: DELETE /api/projects/:id",
    );
  });
});
