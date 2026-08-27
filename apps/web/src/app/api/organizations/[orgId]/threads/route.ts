import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * GET /api/organizations/[orgId]/threads
 *
 * Returns up to 5 most-recent threads owned by the current user within the
 * given organization. Used by the dashboard sidebar to preload the active
 * workspace's recent conversations under the Projects group.
 *
 * Authorization:
 *  - Caller must be authenticated.
 *  - Caller must have a matching active organization (`authState.orgId`).
 *  - Caller must hold a membership row in `orgId`.
 */
export async function GET(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const authState = await getAuth(request);

    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (authState.orgId !== orgId) {
      return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: authState.userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
    }

    const threads = await db.thread.findMany({
      where: { tenantId: orgId, userId: authState.userId },
      orderBy: { lastActivityAt: "desc" },
      take: 5,
      select: { id: true, title: true, lastActivityAt: true },
    });

    return NextResponse.json({
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        lastActivityAt: thread.lastActivityAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("[threads] Failed to list threads", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load threads." }, { status: 500 });
  }
}

/**
 * POST /api/organizations/[orgId]/threads
 *
 * Creates a new Thread row for the current user within the given organization.
 * Body: { title?: string }. Title is trimmed and capped at 200 chars; falls
 * back to "Untitled" when blank/missing. Returns the created thread summary.
 */
export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const authState = await getAuth(request);

    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (authState.orgId !== orgId) {
      return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: authState.userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim().slice(0, 200)
        : "Untitled";

    const thread = await db.thread.create({
      data: { tenantId: orgId, userId: authState.userId, title },
      select: { id: true, title: true, lastActivityAt: true },
    });

    return NextResponse.json(
      {
        thread: {
          id: thread.id,
          title: thread.title,
          lastActivityAt: thread.lastActivityAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[threads] Failed to create thread", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to create thread." }, { status: 500 });
  }
}
