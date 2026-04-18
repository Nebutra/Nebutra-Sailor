import { getSystemDb } from "@nebutra/db";

// AUDIT(no-tenant): Sleptons community profiles are a global, public namespace
// (not tenant-scoped). Member records are keyed on Clerk userId / slug.
const prisma = getSystemDb();

export const MEMBERS_PAGE_SIZE = 24;

export async function getPublicMembers(opts: {
  page?: number;
  tier?: string;
  lookingFor?: string;
}) {
  const { page = 1, tier, lookingFor } = opts;
  const skip = (page - 1) * MEMBERS_PAGE_SIZE;

  const where = {
    is_public: true,
    ...(tier ? { tier: tier as never } : {}),
    ...(lookingFor ? { looking_for: { has: lookingFor } } : {}),
  };

  const [members, total] = await Promise.all([
    prisma.sleptonsaMemberProfile.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: MEMBERS_PAGE_SIZE,
      skip,
      include: { products: { take: 1, orderBy: { created_at: "desc" } } },
    }),
    prisma.sleptonsaMemberProfile.count({ where }),
  ]);

  return { members, total, page, pageSize: MEMBERS_PAGE_SIZE };
}

export async function getMemberBySlug(slug: string) {
  return prisma.sleptonsaMemberProfile.findFirst({
    where: { slug, is_public: true },
    include: { products: { orderBy: { created_at: "desc" } } },
  });
}
