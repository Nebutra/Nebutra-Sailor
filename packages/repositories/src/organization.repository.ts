import type { Organization, Plan, PrismaClient } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination.js";
import { normalizePaginationParams } from "./pagination.js";

export interface CreateOrganizationData {
  clerkId: string;
  name: string;
  slug: string;
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  plan?: Plan;
}

export class OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany();
  }

  async findPaginated(
    params: CursorPaginationParams = {},
  ): Promise<CursorPaginationResult<Organization>> {
    const { cursor, take } = normalizePaginationParams(params);

    const items = await this.prisma.organization.findMany({
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;

    return {
      items: trimmed,
      nextCursor: hasMore ? (trimmed[trimmed.length - 1]?.id ?? null) : null,
      hasNextPage: hasMore,
    };
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async findByClerkId(clerkId: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { clerkId } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }

  /**
   * Alias for `update` — matches the consumer call site in billingSync.ts.
   */
  async updateById(id: string, data: UpdateOrganizationData): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }

  async updateByClerkId(clerkId: string, data: UpdateOrganizationData): Promise<Organization> {
    return this.prisma.organization.update({ where: { clerkId }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }

  async deleteByClerkId(clerkId: string): Promise<void> {
    await this.prisma.organization.delete({ where: { clerkId } });
  }
}
