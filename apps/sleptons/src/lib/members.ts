import { getSystemDb } from "@nebutra/db";

// AUDIT(no-tenant): Sleptons community profiles are a global, public namespace
// (not tenant-scoped). Member records are keyed on Clerk userId / slug.
export const MEMBERS_PAGE_SIZE = 24;

function shouldUseEmptyMemberFallback() {
  return (
    !process.env.DATABASE_URL &&
    (process.env.NODE_ENV !== "production" ||
      process.env.CI === "true" ||
      process.env.SKIP_ENV_VALIDATION === "true")
  );
}

function getOptionalSystemDb() {
  try {
    return getSystemDb();
  } catch (error) {
    if (shouldUseEmptyMemberFallback()) {
      return null;
    }

    throw error;
  }
}

export async function getPublicMembers(opts: {
  page?: number;
  tier?: string;
  lookingFor?: string;
}) {
  const { page = 1, tier, lookingFor } = opts;
  const skip = (page - 1) * MEMBERS_PAGE_SIZE;
  const prisma = getOptionalSystemDb();

  if (!prisma) {
    return { members: [], total: 0, page, pageSize: MEMBERS_PAGE_SIZE };
  }

  const where = {
    is_public: true,
    ...(tier ? { tier: tier as never } : {}),
    ...(lookingFor ? { looking_for: { has: lookingFor } } : {}),
  };

  try {
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
  } catch (error) {
    if (shouldUseEmptyMemberFallback()) {
      return { members: [], total: 0, page, pageSize: MEMBERS_PAGE_SIZE };
    }

    throw error;
  }
}

export async function getMemberBySlug(slug: string) {
  const prisma = getOptionalSystemDb();

  if (!prisma) {
    return null;
  }

  try {
    return await prisma.sleptonsaMemberProfile.findFirst({
      where: { slug, is_public: true },
      include: { products: { orderBy: { created_at: "desc" } } },
    });
  } catch (error) {
    if (shouldUseEmptyMemberFallback()) {
      return null;
    }

    throw error;
  }
}
