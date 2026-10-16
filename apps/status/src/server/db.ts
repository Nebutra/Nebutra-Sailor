import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type StatusDb = PrismaClient;

let client: StatusDb | null = null;

/** The instance's own database. Self-hosted or cloud, it is never the Nebutra platform DB. */
export function getDb(): StatusDb {
  if (client) return client;
  const connectionString = process.env.STATUS_DATABASE_URL;
  if (!connectionString) throw new Error("STATUS_DATABASE_URL is not set");
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  return client;
}

/** Tests inject a PGlite-backed client. */
export function setDbForTests(db: StatusDb | null): void {
  client = db;
}
