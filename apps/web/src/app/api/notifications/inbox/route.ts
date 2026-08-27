import { getNotificationProvider, type InAppFeedOptions } from "@nebutra/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";

// =============================================================================
// GET /api/notifications/inbox — list current user's in-app notifications
// =============================================================================
// Query params:
//   - limit?: number   (default 20, max 100)
//   - cursor?: string  (opaque pagination cursor; numeric offset for now)
//   - unreadOnly?: boolean
//
// Returns: { success, data: { notifications, unreadCount, total, nextCursor } }
// =============================================================================

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  unreadOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

const EMPTY_PAYLOAD = {
  success: true as const,
  data: {
    notifications: [],
    total: 0,
    unreadCount: 0,
    nextCursor: null as string | null,
  },
};

export async function GET(request: Request): Promise<NextResponse> {
  const { userId, orgId } = await requireOrg();

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    unreadOnly: url.searchParams.get("unreadOnly") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid inbox query parameters." },
      { status: 400 },
    );
  }

  const { limit, cursor, unreadOnly } = parsed.data;

  let provider: Awaited<ReturnType<typeof getNotificationProvider>> | undefined;
  try {
    provider = await getNotificationProvider();
  } catch {
    provider = undefined;
  }

  if (!provider) {
    return NextResponse.json(EMPTY_PAYLOAD);
  }

  const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const options: InAppFeedOptions = {
    limit,
    offset,
    ...(unreadOnly ? { unreadOnly: true } : {}),
  };

  try {
    const feed = await provider.getInAppNotifications(userId, options, orgId);
    const nextOffset = offset + feed.notifications.length;
    const nextCursor = nextOffset < feed.total ? String(nextOffset) : null;

    return NextResponse.json({
      success: true,
      data: {
        notifications: feed.notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          readAt: n.read ? n.updatedAt : null,
          read: n.read,
          channel: "in_app" as const,
          data: n.data ?? {},
        })),
        total: feed.total,
        unreadCount: feed.unreadCount,
        nextCursor,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load inbox.",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
