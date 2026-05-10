import type { OrganizationMember, PrismaClient, Role } from "@nebutra/db";
import type { CursorPaginationParams, CursorPaginationResult } from "./pagination.js";
import { normalizePaginationParams } from "./pagination.js";

export interface UpsertMemberData {
  organizationId: string;
  userId: string;
  role: Role;
}

export class OrganizationMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany();
  }

  async findPaginated(
    params: CursorPaginationParams & { organizationId?: string } = {},
  ): Promise<CursorPaginationResult<OrganizationMember>> {
    const { cursor, take } = normalizePaginationParams(params);

    const items = await this.prisma.organizationMember.findMany({
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...(params.organizationId ? { where: { organizationId: params.organizationId } } : {}),
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

  async findById(id: string): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({ where: { id } });
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
    });
  }

  async findByUser(userId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { userId },
    });
  }

  async upsert(data: UpsertMemberData): Promise<OrganizationMember> {
    const { organizationId, userId, role } = data;

    return this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      create: { organizationId, userId, role },
      update: { role },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organizationMember.delete({ where: { id } });
  }

  async deleteByOrganizationAndUser(organizationId: string, userId: string): Promise<void> {
    await this.prisma.organizationMember.delete({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
  }
}
