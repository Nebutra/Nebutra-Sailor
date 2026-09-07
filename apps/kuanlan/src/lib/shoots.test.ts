import { describe, expect, it } from "vitest";
import {
  failShoot,
  listShoots,
  openShoot,
  SHOOT_TASK_TYPE,
  type ShootStore,
  sha256,
  shootIdempotencyKey,
  succeedShoot,
} from "./shoots";

type Row = Record<string, unknown> & { id: string; status: string; createdAt: Date };

/** A tiny in-memory stand-in for `prisma.task`, shaped only as far as shoots.ts reaches. */
function fakeStore(seed: Row[] = []) {
  const rows: Row[] = [...seed];
  const calls: string[] = [];
  // Real rows never share a createdAt; three creates in one millisecond here
  // would, and a tie makes "newest first" meaningless. Tick the clock instead.
  let tick = Date.now();
  const store = {
    task: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push("findFirst");
        const statuses = (where.status as { in: string[] } | undefined)?.in;
        return (
          rows
            .filter(
              (r) =>
                r.tenantId === where.tenantId &&
                r.type === where.type &&
                r.idempotencyKey === where.idempotencyKey &&
                (!statuses || statuses.includes(r.status)),
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
        );
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("create");
        tick += 1;
        const row = {
          ...data,
          result: null,
          error: null,
          createdAt: new Date(tick),
          completedAt: null,
        } as unknown as Row;
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        calls.push("update");
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
      findMany: async ({ where, take }: { where: Record<string, unknown>; take?: number }) => {
        calls.push("findMany");
        const out = rows
          .filter(
            (r) =>
              r.tenantId === where.tenantId && r.type === where.type && r.status === where.status,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return take != null ? out.slice(0, take) : out;
      },
      count: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push("count");
        return rows.filter(
          (r) =>
            r.tenantId === where.tenantId && r.type === where.type && r.status === where.status,
        ).length;
      },
    },
  };
  return { store: store as unknown as ShootStore, rows, calls };
}

const payload = { skuId: "linkedin-smoke", sizeId: "linkedin", sourceHash: "abc" };

describe("idempotency key", () => {
  it("is the same for the same person, spec and portrait", () => {
    const a = shootIdempotencyKey({ userId: "u", skuId: "s", sizeId: "z", sourceHash: "h" });
    const b = shootIdempotencyKey({ userId: "u", skuId: "s", sizeId: "z", sourceHash: "h" });
    expect(a).toBe(b);
  });

  it("changes when any part changes, and never carries the portrait", () => {
    const base = { userId: "u", skuId: "s", sizeId: "z", sourceHash: sha256(Buffer.from("face")) };
    const other = shootIdempotencyKey({ ...base, sizeId: "1in" });
    expect(other).not.toBe(shootIdempotencyKey(base));
    expect(shootIdempotencyKey(base)).not.toContain("face");
  });

  it("fits the column", () => {
    const key = shootIdempotencyKey({
      userId: "u".repeat(200),
      skuId: "s".repeat(200),
      sizeId: "z",
      sourceHash: "h",
    });
    expect(key.length).toBeLessThanOrEqual(120);
  });
});

describe("opening a shoot", () => {
  it("creates a RUNNING row with the payload and the key", async () => {
    const { store, rows } = fakeStore();
    const { row, reused } = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });

    expect(reused).toBe(false);
    expect(row.status).toBe("RUNNING");
    expect(row.payload).toEqual(payload);
    expect(rows[0]).toMatchObject({
      tenantId: "t1",
      userId: "u1",
      type: SHOOT_TASK_TYPE,
      idempotencyKey: "k1",
      startedAt: expect.any(Date),
    });
  });

  it("hands back the open row on a second identical submit instead of creating another", async () => {
    const { store, calls } = fakeStore();
    const first = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });
    const second = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });

    expect(second.reused).toBe(true);
    expect(second.row.id).toBe(first.row.id);
    // One create, not two — the second submit never reaches the model.
    expect(calls.filter((c) => c === "create")).toHaveLength(1);
  });

  it("lets a person retry after a failure", async () => {
    const { store, calls } = fakeStore();
    const first = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });
    await failShoot(store, first.row.id, { step: "router", name: "Timeout", message: "40s" });

    const retry = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });

    expect(retry.reused).toBe(false);
    expect(retry.row.id).not.toBe(first.row.id);
    expect(calls.filter((c) => c === "create")).toHaveLength(2);
  });

  it("does not let one tenant's key collide with another's", async () => {
    const { store } = fakeStore();
    await openShoot(store, { tenantId: "t1", userId: "u1", idempotencyKey: "k1", payload });
    const other = await openShoot(store, {
      tenantId: "t2",
      userId: "u2",
      idempotencyKey: "k1",
      payload,
    });
    expect(other.reused).toBe(false);
  });
});

describe("finishing a shoot", () => {
  it("records the result and marks it done", async () => {
    const { store } = fakeStore();
    const { row } = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });
    const done = await succeedShoot(store, row.id, {
      key: "k/1.png",
      width: 472,
      height: 591,
      dpi: 300,
    });

    expect(done.status).toBe("SUCCEEDED");
    expect(done.result).toEqual({ key: "k/1.png", width: 472, height: 591, dpi: 300 });
    expect(done.completedAt).toBeInstanceOf(Date);
  });

  it("records why it failed, with the step, and nothing that could carry a path", async () => {
    const { store } = fakeStore();
    const { row } = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "k1",
      payload,
    });
    const failed = await failShoot(store, row.id, {
      step: "compose",
      name: "InvalidPortraitError",
      message: "no face",
    });

    expect(failed.status).toBe("FAILED");
    expect(failed.error).toEqual({
      step: "compose",
      name: "InvalidPortraitError",
      message: "no face",
    });
    expect(Object.keys(failed.error ?? {})).not.toContain("stack");
  });
});

describe("listing shoots", () => {
  it("returns only finished ones, newest first, with the full count", async () => {
    const { store } = fakeStore();
    const a = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "a",
      payload,
    });
    await succeedShoot(store, a.row.id, { key: "a", width: 1, height: 1, dpi: 300 });
    const b = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "b",
      payload,
    });
    await failShoot(store, b.row.id, { step: "router", name: "E", message: "m" });
    const c = await openShoot(store, {
      tenantId: "t1",
      userId: "u1",
      idempotencyKey: "c",
      payload,
    });
    await succeedShoot(store, c.row.id, { key: "c", width: 1, height: 1, dpi: 300 });

    const { rows, total } = await listShoots(store, "t1");

    expect(total).toBe(2);
    expect(rows.map((r) => r.result?.key)).toEqual(["c", "a"]);
  });

  it("bounds the page but not the count", async () => {
    const { store } = fakeStore();
    for (const k of ["a", "b", "c"]) {
      const { row } = await openShoot(store, {
        tenantId: "t1",
        userId: "u1",
        idempotencyKey: k,
        payload,
      });
      await succeedShoot(store, row.id, { key: k, width: 1, height: 1, dpi: 300 });
    }

    const { rows, total } = await listShoots(store, "t1", { limit: 1 });

    expect(total).toBe(3);
    expect(rows).toHaveLength(1);
  });
});
