/**
 * The identity-link backfill runs against production data, so it is exercised
 * on a real Postgres engine with every repository migration applied.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { vector } from "@electric-sql/pglite/vector";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script
import { planLinks, runBackfill } from "../scripts/backfill-identity-links.mjs";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");
let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { vector, uuid_ossp } });
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const name of names)
    await db.exec(readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"));
  await db.exec(`
    -- owner: Clerk-era row + verified auth user + an orphan mirror row (no email) with a tenant
    INSERT INTO users (id, clerk_id, email, updated_at) VALUES ('cms_owner', 'user_clerk', 'Owner@Example.com', now());
    INSERT INTO users (id, updated_at) VALUES ('ba_owner', now());
    INSERT INTO tenants (id, kind, user_id) VALUES ('t_orphan', 'INDIVIDUAL', 'ba_owner'), ('t_owner', 'INDIVIDUAL', 'cms_owner');
    INSERT INTO auth_users (id, email, email_verified, updated_at) VALUES ('ba_owner', 'owner@example.com', true, now());
    -- clean: legacy row, verified auth user, no own row
    INSERT INTO users (id, clerk_id, email, updated_at) VALUES ('cms_clean', 'user_c', 'clean@example.com', now());
    INSERT INTO auth_users (id, email, email_verified, updated_at) VALUES ('ba_clean', 'clean@example.com', true, now());
    -- unverified: must never link
    INSERT INTO users (id, clerk_id, email, updated_at) VALUES ('cms_unv', 'user_u', 'unv@example.com', now());
    INSERT INTO auth_users (id, email, email_verified, updated_at) VALUES ('ba_unv', 'unv@example.com', false, now());
    -- consistent: same id both sides
    INSERT INTO users (id, email, updated_at) VALUES ('ba_same', 'same@example.com', now());
    INSERT INTO auth_users (id, email, email_verified, updated_at) VALUES ('ba_same', 'same@example.com', true, now());
    -- auth user with no users row at all
    INSERT INTO auth_users (id, email, email_verified, updated_at) VALUES ('ba_fresh', 'fresh@example.com', true, now());
  `);
});
afterAll(async () => {
  await db?.close();
});

const links = async () =>
  (
    await db.query<{ subject: string; user_id: string; source: string }>(
      "SELECT subject, user_id, source FROM user_identity_links ORDER BY subject",
    )
  ).rows;

describe("identity link backfill", () => {
  it("dry run writes nothing and reports what it would do", async () => {
    const r = await runBackfill(db, { includeOrphans: true });
    expect(r.mode).toBe("dry-run");
    expect(r.counts).toMatchObject({ toLink: 2, written: 0, needsReview: 1 });
    expect(r.plan.link.map((l: { subject: string }) => l.subject).sort()).toEqual([
      "ba_clean",
      "ba_owner",
    ]);
    expect(r.plan.review).toEqual([
      expect.objectContaining({ subject: "ba_unv", reason: "unverified_email" }),
    ]);
    const owner = r.plan.link.find((l: { subject: string }) => l.subject === "ba_owner");
    expect(owner.orphanDependents).toEqual({ "tenants.user_id": 1 });
    expect(owner.targetDependents).toEqual({ "tenants.user_id": 1 });
    expect(owner.email).toBe("ow***@example.com");
    expect(await links()).toEqual([]);
  });

  it("leaves orphan cases for review unless asked", async () => {
    const r = await runBackfill(db, {});
    expect(r.plan.link.map((l: { subject: string }) => l.subject)).toEqual(["ba_clean"]);
    expect(r.plan.review.map((x: { reason: string }) => x.reason).sort()).toEqual([
      "subject_has_own_users_row",
      "unverified_email",
    ]);
  });

  it("applies idempotently, never touching the orphan's data", async () => {
    const first = await runBackfill(db, { apply: true, includeOrphans: true });
    expect(first.written.sort()).toEqual(["ba_clean", "ba_owner"]);
    expect(await links()).toEqual([
      { subject: "ba_clean", user_id: "cms_clean", source: "backfill" },
      { subject: "ba_owner", user_id: "cms_owner", source: "backfill" },
    ]);
    const second = await runBackfill(db, { apply: true, includeOrphans: true });
    expect(second.counts).toMatchObject({ toLink: 0, written: 0 });
    expect((await links()).length).toBe(2);
    const tenants = await db.query("SELECT id, user_id FROM tenants ORDER BY id");
    expect(tenants.rows).toEqual([
      { id: "t_orphan", user_id: "ba_owner" },
      { id: "t_owner", user_id: "cms_owner" },
    ]);
  });
});

describe("planLinks", () => {
  const legacy = { id: "L", email: "a@x.com", clerk_id: "c" };
  it("does not link two subjects to one legacy row", () => {
    const plan = planLinks({
      authUsers: [{ id: "s2", email: "a@x.com", email_verified: true }],
      users: [legacy],
      links: [{ subject: "s1", user_id: "L" }],
    });
    expect(plan.link).toEqual([]);
    expect(plan.review[0].reason).toBe("legacy_row_linked_to_another_subject");
  });
  it("sends an ambiguous email to review", () => {
    const plan = planLinks({
      authUsers: [{ id: "s", email: "a@x.com", email_verified: true }],
      users: [legacy, { id: "L2", email: "A@x.com", clerk_id: "c2" }],
      links: [],
    });
    expect(plan.review[0].reason).toBe("ambiguous_legacy_rows");
  });
  it("ignores non-Clerk rows as link targets", () => {
    const plan = planLinks({
      authUsers: [{ id: "s", email: "a@x.com", email_verified: true }],
      users: [{ id: "N", email: "a@x.com", clerk_id: null }],
      links: [],
    });
    expect(plan.link).toEqual([]);
  });
});
