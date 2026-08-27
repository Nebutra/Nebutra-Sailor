import { describe, expect, it, vi } from "vitest";
import { DEV_ORGANIZATION_ID, DEV_TENANT_ID, DEV_USER_ID, ensureDevTenant } from "../dev-tenant";

// Guard the default-arg path: `getSystemDb()` must never touch a real client in
// tests. The injected mock below is what every assertion actually exercises.
vi.mock("@nebutra/db", () => ({
  getSystemDb: () => {
    throw new Error("getSystemDb() should not be invoked when a db is injected");
  },
}));

type UpsertCall = {
  readonly model: string;
  readonly args: Record<string, unknown>;
};

function createRecordingDb() {
  const calls: UpsertCall[] = [];
  const upsert = (model: string) => (args: Record<string, unknown>) => {
    calls.push({ model, args });
    return Promise.resolve({});
  };

  return {
    calls,
    db: {
      organization: { upsert: upsert("organization") },
      user: { upsert: upsert("user") },
      organizationMember: { upsert: upsert("organizationMember") },
      tenant: { upsert: upsert("tenant") },
    },
  };
}

describe("ensureDevTenant", () => {
  it("upserts Organization before Tenant (correct FK order)", async () => {
    const { calls, db } = createRecordingDb();

    // biome-ignore lint/suspicious/noExplicitAny: keyless structural mock for unit test
    await ensureDevTenant(db as any);

    const models = calls.map((call) => call.model);
    expect(models).toEqual(["organization", "user", "organizationMember", "tenant"]);

    const orgIndex = models.indexOf("organization");
    const userIndex = models.indexOf("user");
    const memberIndex = models.indexOf("organizationMember");
    const tenantIndex = models.indexOf("tenant");

    // Organization is the FK target for both membership and tenant.
    expect(orgIndex).toBeLessThan(memberIndex);
    expect(orgIndex).toBeLessThan(tenantIndex);
    // User is the FK target for the membership.
    expect(userIndex).toBeLessThan(memberIndex);
    // Tenant references Organization, so it must come after it.
    expect(orgIndex).toBeLessThan(tenantIndex);
  });

  it("seeds the fixture ids and ORGANIZATION tenant kind", async () => {
    const { calls, db } = createRecordingDb();

    // biome-ignore lint/suspicious/noExplicitAny: keyless structural mock for unit test
    await ensureDevTenant(db as any);

    const byModel = (model: string) =>
      calls.find((call) => call.model === model)?.args as
        | { where: Record<string, unknown>; create: Record<string, unknown> }
        | undefined;

    expect(byModel("organization")?.create).toMatchObject({ id: DEV_ORGANIZATION_ID });
    expect(byModel("user")?.create).toMatchObject({ id: DEV_USER_ID });

    const tenant = byModel("tenant");
    expect(tenant?.where).toEqual({ id: DEV_TENANT_ID });
    expect(tenant?.create).toMatchObject({
      id: DEV_TENANT_ID,
      kind: "ORGANIZATION",
      organizationId: DEV_ORGANIZATION_ID,
    });
    // id-reuse convention: Tenant.id == Organization.id.
    expect(DEV_TENANT_ID).toBe(DEV_ORGANIZATION_ID);
  });

  it("uses upsert (not create) so repeated calls are idempotent", async () => {
    const { calls, db } = createRecordingDb();

    // biome-ignore lint/suspicious/noExplicitAny: keyless structural mock for unit test
    await ensureDevTenant(db as any);

    // Every write must be an upsert keyed by `where` with an empty `update`,
    // which is what makes a second invocation a safe no-op.
    for (const call of calls) {
      const args = call.args as { where?: unknown; create?: unknown; update?: unknown };
      expect(args.where).toBeDefined();
      expect(args.create).toBeDefined();
      expect(args.update).toEqual({});
    }
  });

  it("is safe to call twice (idempotent)", async () => {
    const { calls, db } = createRecordingDb();

    // biome-ignore lint/suspicious/noExplicitAny: keyless structural mock for unit test
    await ensureDevTenant(db as any);
    // biome-ignore lint/suspicious/noExplicitAny: keyless structural mock for unit test
    await expect(ensureDevTenant(db as any)).resolves.toBeUndefined();

    // Each call issues the same four upserts; no throw, no extra side effects.
    expect(calls).toHaveLength(8);
  });
});
