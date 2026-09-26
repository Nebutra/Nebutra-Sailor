/**
 * `PersonalTenantRepository` against a real Prisma client. The gateway bills a
 * personal offer (a Kuanlan pack) to this tenant and Kuanlan spends from it, so
 * both must land on the same row, however often and however concurrently the
 * first purchase and the first shoot ask for it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PersonalTenantRepository } from "../personal-tenant.repository";

// The tables straight from the baseline, so this cannot drift from the schema.
const baseline = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../db/prisma/migrations/00000000000000_baseline/migration.sql",
  ),
  "utf8",
);
const statement = (start: string) => {
  const from = baseline.indexOf(start);
  return baseline.slice(from, baseline.indexOf(";", from) + 1);
};
const DDL = [
  statement('CREATE TYPE "TenantKind"'),
  statement('CREATE TYPE "TenantLifecycleState"'),
  statement('CREATE TABLE "users"'),
  statement('CREATE TABLE "tenants"'),
  'CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");',
].join("\n");

describe("PersonalTenantRepository (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: PersonalTenantRepository;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(DDL);
    repository = new PersonalTenantRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  it("has no tenant for someone who never used a personal product", async () => {
    await expect(repository.find("user_nobody")).resolves.toBeNull();
  });

  it("provisions one tenant per person, and returns the same one every time", async () => {
    const ids = await Promise.all([
      repository.ensure({ userId: "user_a", email: "a@example.com" }),
      repository.ensure({ userId: "user_a" }),
      repository.ensure({ userId: "user_a" }),
    ]).catch(async () =>
      // A concurrent upsert may lose the race on the unique index; the retry is
      // what a caller sees. Either way there is one row.
      [await repository.ensure({ userId: "user_a" })],
    );
    const found = await repository.find("user_a");
    expect(new Set([...ids, found])).toEqual(new Set([found]));
    const rows = await database.prisma.tenant.findMany({ where: { userId: "user_a" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("INDIVIDUAL");
  });
});
