import type { PrismaClient, User } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination.js";
import { normalizePaginationParams } from "./pagination.js";

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
