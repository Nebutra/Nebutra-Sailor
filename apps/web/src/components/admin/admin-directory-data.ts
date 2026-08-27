import "server-only";
import type { Prisma } from "@nebutra/db";
import { db } from "@/lib/db";
import type { AdminOrganizationSearchResult, AdminUserSearchResult } from "./admin-directory-panel";

export interface AdminDirectoryResult {
  query: string;
  page: number;
  pageSize: number;
  users: AdminUserSearchResult[];
  organizations: AdminOrganizationSearchResult[];
  totalUsers: number;
  totalOrganizations: number;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function normalizePositiveInteger(value: number, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

export function normalizeDirectoryQuery(input: {
  query?: string | null;
  page?: string | number | null;
  pageSize?: string | number | null;
}) {
  const query = (input.query ?? "").trim();
  const page = normalizePositiveInteger(Number(input.page), 1);
  const pageSize = normalizePositiveInteger(
    Number(input.pageSize),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  return { query, page, pageSize };
}

function buildUserWhere(query: string): Prisma.UserWhereInput | undefined {
  if (!query) return undefined;

  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      {
        organizations: {
          some: {
            organization: { name: { contains: query, mode: "insensitive" } },
          },
        },
      },
    ],
  };
}

function buildOrganizationWhere(query: string): Prisma.OrganizationWhereInput | undefined {
  if (!query) return undefined;

  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
    ],
  };
}

export async function listAdminDirectory(input: {
  query?: string | null;
  page?: string | number | null;
  pageSize?: string | number | null;
}): Promise<AdminDirectoryResult> {
  const { query, page, pageSize } = normalizeDirectoryQuery(input);
  const skip = (page - 1) * pageSize;
  const userWhere = buildUserWhere(query);
  const organizationWhere = buildOrganizationWhere(query);

  const [totalUsers, totalOrganizations, users, organizations] = await Promise.all([
    db.user.count({ where: userWhere }),
    db.organization.count({ where: organizationWhere }),
    db.user.findMany({
      where: userWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        organizations: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    db.organization.findMany({
      where: organizationWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
      },
    }),
  ]);

  return {
    query,
    page,
    pageSize,
    totalUsers,
    totalOrganizations,
    users: users.map((user) => ({
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      organizationName: user.organizations[0]?.organization.name ?? null,
      emailVerified: null,
    })),
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      planName: organization.plan,
    })),
  };
}
