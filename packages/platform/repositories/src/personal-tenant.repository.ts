import type { PrismaClient } from "@nebutra/db";
import { UserRepository } from "./user.repository";

/**
 * A person's own tenant — the account a consumer product bills.
 *
 * Kuanlan sells to individuals, like 剪映: the credits a person buys are theirs,
 * not their company's. The schema already models it (`Tenant.kind =
 * INDIVIDUAL`, `Tenant.userId @unique`), so this is one upsert, idempotent
 * under concurrency because the uniqueness lives in the database.
 *
 * Takes the system client on purpose: the tenants table is what tenant scoping
 * is derived from, so there is no tenant to scope to before the row exists.
 */
export class PersonalTenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** The person's tenant id, or null when none was ever provisioned. */
  async find(userId: string): Promise<string | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { userId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /**
   * The person's tenant id, provisioning it (and the `users` row it references,
   * which Better Auth never writes) on first use.
   */
  async ensure(identity: { userId: string; email?: string | null }): Promise<string> {
    await new UserRepository(this.prisma).ensureFromIdentity({
      id: identity.userId,
      email: identity.email ?? null,
    });
    const row = await this.prisma.tenant.upsert({
      where: { userId: identity.userId },
      create: { kind: "INDIVIDUAL", userId: identity.userId },
      update: {},
      select: { id: true },
    });
    return row.id;
  }
}
