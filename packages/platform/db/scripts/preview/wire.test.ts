/**
 * The preview database's wire server: many `pg` pools, one PGlite session.
 * Connections may only change hands at ReadyForQuery-idle, so concurrent
 * extended-protocol exchanges and transactions never see each other.
 */
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM script, no declarations
import { createWireServer } from "./wire.mjs";

let db: PGlite;
let wire: { listen(port: number): Promise<number>; close(): Promise<void>; connections: number };
let url: string;

beforeAll(async () => {
  db = await PGlite.create();
  wire = createWireServer(db, { idleInTransactionMs: 1_000 });
  url = `postgresql://postgres:postgres@127.0.0.1:${await wire.listen(0)}/postgres`;
  await db.exec("create table t (id int primary key, v text)");
});

afterAll(async () => {
  await wire?.close();
  await db?.close();
});

describe("preview wire server", () => {
  it("keeps concurrent parameterised queries and transactions from three pools apart", async () => {
    const pools = [0, 1, 2].map(() => new pg.Pool({ connectionString: url, max: 5 }));
    let mismatches = 0;
    try {
      await Promise.all(
        Array.from({ length: 300 }, async (_, i) => {
          const pool = pools[i % 3];
          if (i % 5 === 0) {
            const client = await pool.connect();
            try {
              await client.query("begin");
              await client.query("insert into t values ($1, $2)", [i, `v${i}`]);
              const { rows } = await client.query("select v from t where id = $1", [i]);
              if (rows[0]?.v !== `v${i}`) mismatches++;
              await client.query(i % 10 === 0 ? "rollback" : "commit");
            } finally {
              client.release();
            }
          } else {
            // Distinct statement text per query: a statement bound by another
            // connection's parameters would show up as a wrong k.
            const { rows } = await pool.query(`select $1::int as a, ${i}::int as k`, [i]);
            if (rows[0].a !== i || rows[0].k !== i) mismatches++;
          }
        }),
      );
    } finally {
      await Promise.all(pools.map((p) => p.end()));
    }
    expect(mismatches).toBe(0);
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from t");
    expect(rows[0].n).toBe(30); // 60 transactions, half rolled back
  });

  it("rolls back and frees the engine when a connection dies inside a transaction", async () => {
    const dying = new pg.Client({ connectionString: url });
    dying.on("error", () => undefined);
    await dying.connect();
    await dying.query("begin");
    await dying.query("insert into t values (100001, 'lost')");
    (
      dying as unknown as { connection: { stream: { destroy(): void } } }
    ).connection.stream.destroy();

    const other = new pg.Client({ connectionString: url });
    await other.connect();
    const { rows } = await other.query("select count(*)::int as n from t where id = 100001");
    await other.end();
    expect(rows[0].n).toBe(0);
    expect(db.isInTransaction()).toBe(false);
  });

  it("frees the engine from a connection idle inside a transaction", async () => {
    const idle = new pg.Client({ connectionString: url });
    idle.on("error", () => undefined);
    await idle.connect();
    await idle.query("begin");

    const other = new pg.Client({ connectionString: url });
    const started = Date.now();
    await other.connect(); // queued behind the open transaction until the idle timeout
    await other.query("select 1");
    await other.end();
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });
});
