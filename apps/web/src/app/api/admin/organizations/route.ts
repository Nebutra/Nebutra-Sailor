import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  search: z.string().trim().max(120).optional(),
});

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function clampPagination(rawPage: unknown, rawPageSize: unknown) {
  const parsed = QuerySchema.safeParse({ page: rawPage, pageSize: rawPageSize });
  const page = parsed.success && parsed.data.page > 0 ? parsed.data.page : DEFAULT_PAGE;
  const pageSize =
    parsed.success && parsed.data.pageSize > 0
      ? Math.min(parsed.data.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
  _count?: { members: number };
}

export async function GET(request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:access")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const { page, pageSize } = clampPagination(
    url.searchParams.get("page"),
    url.searchParams.get("pageSize"),
  );
  const search = (url.searchParams.get("search") ?? "").trim();

  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : undefined;

  try {
    const [rows, total] = await Promise.all([
      db.organization.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      }),
      db.organization.count({ where }),
    ]);

    const organizations = (rows as OrgRow[]).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      createdAt:
        o.createdAt instanceof Date
          ? o.createdAt.toISOString()
          : (o.createdAt as unknown as string),
      memberCount: o._count?.members ?? 0,
    }));

    return NextResponse.json({ organizations, total, page, pageSize });
  } catch (error) {
    logger.error("[admin.organizations] Failed to load organizations", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load organizations." }, { status: 500 });
  }
}
