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

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  _count?: { organizations: number };
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

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  try {
    const [rows, total] = await Promise.all([
      db.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { organizations: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    const users = (rows as UserRow[]).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : (u.createdAt as unknown as string),
      activeOrgsCount: u._count?.organizations ?? 0,
    }));

    return NextResponse.json({ users, total, page, pageSize });
  } catch (error) {
    logger.error("[admin.users] Failed to load users", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}
