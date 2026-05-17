import { beforeEach, describe, expect, it } from "vitest";
import { _resetTenantLocks, withTenantLock } from "../lock";
import { InMemoryTenantStore } from "../store";

describe("withTenantLock", () => {
  beforeEach(() => _resetTenantLocks());

  it("serializes calls for the same (tenant, resource) in submission order", async () => {
    const order: number[] = [];
    const slow = (n: number, ms: number) =>
      withTenantLock("t1", "r1", async () => {
        await new Promise((r) => setTimeout(r, ms));
        order.push(n);
      });
    // 1 submitted first but slowest — must still finish before 2 and 3.
    await Promise.all([slow(1, 30), slow(2, 5), slow(3, 1)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("runs different resources concurrently", async () => {
    const order: string[] = [];
    await Promise.all([
      withTenantLock("t1", "a", async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push("a");
      }),
      withTenantLock("t1", "b", async () => {
        order.push("b");
      }),
    ]);
    // b (no wait) finishes before slow a → proves no cross-resource serialization.
    expect(order).toEqual(["b", "a"]);
  });

  it("isolates the same resourceId across tenants", async () => {
    const order: string[] = [];
    await Promise.all([
      withTenantLock("tenantA", "shared", async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push("A");
      }),
      withTenantLock("tenantB", "shared", async () => {
        order.push("B");
      }),
    ]);
    expect(order).toEqual(["B", "A"]);
  });

  it("does not deadlock the next waiter when a section rejects", async () => {
    const failing = withTenantLock("t1", "r1", async () => {
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");
    const ok = await withTenantLock("t1", "r1", async () => "recovered");
    expect(ok).toBe("recovered");
  });

  it("returns the section's value", async () => {
    await expect(withTenantLock("t1", "r1", async () => 42)).resolves.toBe(42);
  });
});

interface Row {
  readonly id: string;
  readonly tenantId: string;
  readonly value: number;
}

describe("InMemoryTenantStore", () => {
  let store: InMemoryTenantStore<Row>;
  beforeEach(() => {
    store = new InMemoryTenantStore<Row>();
  });

  it("round-trips a written record", async () => {
    const row: Row = { id: "1", tenantId: "t1", value: 7 };
    await store.write("t1", "1", row);
    expect(await store.read("t1", "1")).toEqual(row);
  });

  it("returns null for a missing record", async () => {
    expect(await store.read("t1", "missing")).toBeNull();
  });

  it("isolates records across tenants (read)", async () => {
    await store.write("tenantA", "1", { id: "1", tenantId: "tenantA", value: 1 });
    expect(await store.read("tenantB", "1")).toBeNull();
  });

  it("isolates records across tenants (list)", async () => {
    await store.write("tenantA", "1", { id: "1", tenantId: "tenantA", value: 1 });
    await store.write("tenantA", "2", { id: "2", tenantId: "tenantA", value: 2 });
    await store.write("tenantB", "3", { id: "3", tenantId: "tenantB", value: 3 });
    const a = await store.listByTenant("tenantA");
    expect(a.map((r) => r.id).sort()).toEqual(["1", "2"]);
    expect(await store.listByTenant("tenantB")).toHaveLength(1);
  });

  it("clear() empties all tenants", async () => {
    await store.write("t1", "1", { id: "1", tenantId: "t1", value: 1 });
    store.clear();
    expect(await store.read("t1", "1")).toBeNull();
    expect(await store.listByTenant("t1")).toHaveLength(0);
  });
});
