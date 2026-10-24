/**
 * A real Postgres (PGlite over a local socket) with this app's own migrations
 * applied — the same SQL `prisma migrate deploy` runs in production.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { StatusDb } from "./db";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => (port ? resolve(port) : reject(new Error("no free port"))));
    });
  });
}

export interface TestDb {
  db: StatusDb;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite-socket"),
  ]);
  const pglite = new PGlite();
  const migrationsDir = path.resolve(__dirname, "../../prisma/migrations");
  for (const dir of readdirSync(migrationsDir)
    .filter((d) => /^\d{14}_/.test(d))
    .sort()) {
    await pglite.exec(readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
  }
  const port = await freePort();
  const server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1" });
  await server.start();
  const db = new PrismaClient({
    // The socket server serves one connection at a time; a second pooled
    // connection would wait on the first forever.
    adapter: new PrismaPg({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:${port}/template1`,
      max: 1,
    }),
  });
  return {
    db,
    async close() {
      await db.$disconnect().catch(() => undefined);
      await server.stop().catch(() => undefined);
      await pglite.close().catch(() => undefined);
    },
  };
}
