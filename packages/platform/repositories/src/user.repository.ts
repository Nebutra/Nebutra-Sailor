import type { Prisma, PrismaClient, User } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination";
import { normalizePaginationParams } from "./pagination";

export interface CreateUserData {
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface UpsertByClerkIdData {
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { clerkId } });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateByClerkId(clerkId: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { clerkId }, data });
  }

  async upsertByClerkId(data: UpsertByClerkIdData): Promise<User> {
    const { clerkId, email, name, avatarUrl } = data;

    return this.prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email,
        ...(name !== null && { name }),
        ...(avatarUrl !== null && { avatarUrl }),
      },
      update: {
        email,
        name,
        avatarUrl,
      },
    });
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
   * A login refreshes the email, since that is what the auth provider owns; a
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
    return this.prisma.user.upsert({ where: { id }, create, update });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async deleteByClerkId(clerkId: string): Promise<void> {
    await this.prisma.user.delete({ where: { clerkId } });
  }

  /**
   * Delete a user by Clerk ID if they exist. No-op if user is not found.
   */
  async deleteIfExistsByClerkId(clerkId: string): Promise<void> {
    await this.prisma.user.deleteMany({ where: { clerkId } });
  }
}
