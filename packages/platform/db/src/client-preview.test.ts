/**
 * The preview database must be invisible to a deployment: with DATABASE_URL
 * set, the pool gets exactly that URL, its connect() is untouched, and the
 * module that can start the preview database is never imported.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pools: [] as Array<{ options: Record<string, unknown>; connect: unknown; realConnect: unknown }>,
  previewServerImported: false,
  ensured: [] as unknown[],
}));

vi.mock("pg", () => {
  class Pool {
    options: Record<string, unknown>;
    realConnect: unknown;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.realConnect = this.connect;
      state.pools.push(this as never);
    }
    on() {
      return this;
    }
    connect(callback?: (error: unknown, client: unknown, done: () => void) => void) {
      const client = { release() {} };
      if (callback) {
        callback(undefined, client, () => undefined);
        return undefined;
      }
      return Promise.resolve(client);
    }
  }
  return { default: { Pool } };
});

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(public pool: unknown) {}
  },
}));

vi.mock("#prisma-client", () => ({
  PrismaClient: class {
    $extends() {
      return this;
    }
  },
}));

vi.mock("#preview-db-server", () => {
  state.previewServerImported = true;
  return {
    ensurePreviewDatabase: async (preview: unknown) => {
      state.ensured.push(preview);
    },
  };
});

const saved = { ...process.env };

async function freshClient(env: Record<string, string | undefined>) {
  vi.resetModules();
  state.pools.length = 0;
  state.ensured.length = 0;
  for (const key of ["DATABASE_URL", "APP_DB_ROLE", "NEBUTRA_PREVIEW_DB_PORT"])
    delete process.env[key];
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  delete (globalThis as { prisma?: unknown }).prisma;
  const client = await import("./client");
  // Property access on the lazy proxy creates the client (and its pool).
  void (client.getSystemDb() as unknown as Record<string, unknown>).$extends;
  return state.pools[0];
}

beforeEach(() => {
  state.previewServerImported = false;
});

afterEach(() => {
  process.env = { ...saved };
});

describe("with DATABASE_URL set", () => {
  it("uses that URL unchanged and never loads the preview database code", async () => {
    const url = "postgresql://app:secret@db.example.com:6432/app?sslmode=require";
    const pool = await freshClient({ DATABASE_URL: url, NODE_ENV: "development" });

    expect(pool.options.connectionString).toBe(url);
    expect(pool.connect).toBe(pool.realConnect);
    await (pool.connect as () => Promise<unknown>)();
    expect(state.previewServerImported).toBe(false);
    expect(state.ensured).toEqual([]);
  });

  it("does the same in production", async () => {
    const pool = await freshClient({ DATABASE_URL: "postgres://x@h/db", NODE_ENV: "production" });
    expect(pool.options.connectionString).toBe("postgres://x@h/db");
    expect(pool.connect).toBe(pool.realConnect);
    expect(state.previewServerImported).toBe(false);
  });

  it("keeps the old error when DATABASE_URL is missing in production", async () => {
    await expect(freshClient({ NODE_ENV: "production", DATABASE_URL: undefined })).rejects.toThrow(
      "[db] DATABASE_URL is not set. Cannot initialize database connection pool.",
    );
    expect(state.previewServerImported).toBe(false);
  });

  it("imports PGlite nowhere in the runtime sources — only the test harness does", () => {
    const src = dirname(fileURLToPath(import.meta.url));
    const offenders = readdirSync(src)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testing.ts")
      .filter((f) => /@electric-sql\/pglite/.test(readFileSync(join(src, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("with no DATABASE_URL outside production", () => {
  it("points the pool at the preview database and waits for it before the first connection", async () => {
    const pool = await freshClient({ NODE_ENV: "development", DATABASE_URL: undefined });

    expect(pool.options.connectionString).toBe(
      "postgresql://postgres:postgres@127.0.0.1:54329/postgres?sslmode=disable",
    );
    expect(pool.connect).not.toBe(pool.realConnect);
    expect(state.previewServerImported).toBe(false); // not until a connection is wanted

    await (pool.connect as () => Promise<unknown>)();
    expect(state.previewServerImported).toBe(true);
    expect(state.ensured).toHaveLength(1);

    // the callback form pg.Pool#query uses goes through the same gate
    await new Promise<void>((resolve, reject) =>
      (pool.connect as (cb: (e: unknown) => void) => void)((error) =>
        error ? reject(error) : resolve(),
      ),
    );
    expect(state.ensured).toHaveLength(1); // ensured once per pool
  });
});
