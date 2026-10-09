import type { PrismaClient } from "@nebutra/db";

/**
 * An in-memory stand-in for the three Prisma delegates the staff repository
 * touches, so the repository's guards (last owner, tombstone, re-grant) are
 * exercised for real in this package's tests and in the gateway's route tests
 * without a database. Test support only — nothing in production imports it.
 */
type Role = "PLATFORM_OWNER" | "PLATFORM_OPERATOR" | "PLATFORM_SUPPORT" | "PLATFORM_READONLY";

interface StaffRecord {
  userId: string;
  role: Role;
  grantedById: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  note: string | null;
}

interface UserRecord {
  id: string;
  email: string | null;
  name: string | null;
}

export function createInMemoryPlatformStaffDb(seed: {
  users: UserRecord[];
  staff?: Array<Partial<StaffRecord> & Pick<StaffRecord, "userId" | "role">>;
}) {
  const users = [...seed.users];
  const staff = new Map<string, StaffRecord>();
  for (const s of seed.staff ?? []) {
    staff.set(s.userId, {
      grantedById: null,
      grantedAt: new Date("2026-01-01T00:00:00Z"),
      revokedAt: null,
      note: null,
      ...s,
    });
  }

  const userDelegate = {
    findFirst: async ({ where }: { where: { email: { equals: string } } }) =>
      users.find((u) => u.email?.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
    findUnique: async ({ where }: { where: { id: string } }) =>
      users.find((u) => u.id === where.id) ?? null,
    findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      users.filter((u) => where.id.in.includes(u.id)),
  };

  const withUser = (r: StaffRecord) => ({
    ...r,
    user: { email: users.find((u) => u.id === r.userId)?.email ?? null, name: null },
  });

  const delegate = {
    findUnique: async ({ where }: { where: { userId: string } }) => {
      const r = staff.get(where.userId);
      return r ? withUser(r) : null;
    },
    findMany: async () => [...staff.values()].map(withUser),
    count: async ({ where }: { where: { role: Role; revokedAt: null } }) =>
      [...staff.values()].filter((r) => r.role === where.role && r.revokedAt === null).length,
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { userId: string };
      create: Partial<StaffRecord> & Pick<StaffRecord, "userId" | "role">;
      update: Partial<StaffRecord>;
    }) => {
      const existing = staff.get(where.userId);
      const next: StaffRecord = existing
        ? { ...existing, ...update }
        : {
            grantedById: null,
            grantedAt: new Date(),
            revokedAt: null,
            note: null,
            ...create,
          };
      staff.set(where.userId, next);
      return next;
    },
    update: async ({ where, data }: { where: { userId: string }; data: Partial<StaffRecord> }) => {
      const existing = staff.get(where.userId);
      if (!existing) throw new Error("not found");
      const next = { ...existing, ...data };
      staff.set(where.userId, next);
      return next;
    },
  };

  const client = {
    user: userDelegate,
    platformStaff: delegate,
    // Roll back on throw, like a real transaction.
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const snapshot = new Map([...staff].map(([k, v]) => [k, { ...v }]));
      try {
        return await fn(client);
      } catch (error) {
        staff.clear();
        for (const [k, v] of snapshot) staff.set(k, v);
        throw error;
      }
    },
  };

  return { prisma: client as unknown as PrismaClient, staff, users };
}
