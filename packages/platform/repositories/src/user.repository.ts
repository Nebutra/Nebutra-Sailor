import type { Prisma, PrismaClient, User } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface UpdateUserData {
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
}

/**
 * What an authenticated identity may assert about itself when a `users` row is
 * created on its behalf. `id` is the auth provider's user id — Better Auth's
 * `auth_users.id` — and becomes `users.id`, so every table that references
 * `users` can hold a session's `userId` directly, with no lookup between.
 */
export interface IdentityRecord {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findPaginated(params: CursorPaginationParams = {}): Promise<CursorPaginationResult<User>> {
    const { cursor, take } = normalizePaginationParams(params);

    const items = await this.prisma.user.findMany({
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasNextPage = items.length > take;
    if (hasNextPage) items.pop();

    return {
      items,
      nextCursor: hasNextPage ? (items[items.length - 1]?.id ?? null) : null,
      hasNextPage,
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  /**
   * Make sure the `users` row for an authenticated identity exists.
   *
   * `users` was first written by the Clerk webhook, so it was keyed by
   * `clerkId`; Better Auth keeps its own `auth_users` table and never wrote
   * here, which left thirteen foreign keys — tenants, consents, skills — with
   * nothing to point at for anyone who signed up after the switch. This is the
   * bridge. The Better Auth `user.create.after` hook calls it for new sign-ups;
   * anything about to reference `users` calls it lazily for people who signed
   * up before the hook existed. Both are one upsert keyed by id, so they are
   * idempotent and safe to race.
   *
   * A login refreshes an available email; a legacy identity's email is never
   * used to link accounts or transfer ownership. Auth identity id is canonical. A
   * name or avatar a person set here is never overwritten by one.
   */
  async ensureFromIdentity(identity: IdentityRecord): Promise<User> {
    const { id, email, name, avatarUrl } = identity;
    const create: Prisma.UserCreateInput = { id };
    const update: Prisma.UserUpdateInput = {};
    if (email != null) {
      create.email = email;
      update.email = email;
    }
    if (name != null) create.name = name;
    if (avatarUrl != null) create.avatarUrl = avatarUrl;
    try {
      return await this.prisma.user.upsert({ where: { id }, create, update });
    } catch (error) {
      // Clerk-era rows can own the same unique email as a new Better Auth id.
      // Keep both identities isolated. Account migration is an explicit flow,
      // never an implicit email match; the auth service retains the email.
      if (
        email == null ||
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "P2002"
      )
        throw error;
      const owner = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!owner || owner.id === id) throw error;
      delete create.email;
      delete update.email;
      return this.prisma.user.upsert({ where: { id }, create, update });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
