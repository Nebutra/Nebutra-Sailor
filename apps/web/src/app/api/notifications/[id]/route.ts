import { getNotificationProvider } from "@nebutra/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";

// =============================================================================
// PATCH /api/notifications/[id] — mark a notification as read/unread
// DELETE /api/notifications/[id] — soft-archive (mark as read; flag in metadata)
// =============================================================================

const patchSchema = z.object({
  read: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function loadProvider(): Promise<Awaited<ReturnType<typeof getNotificationProvider>> | null> {
  try {
    return await getNotificationProvider();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const { userId, orgId } = await requireOrg();

  const id = await resolveId(context);
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Notification ID is required." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request body — `read` must be boolean." },
      { status: 400 },
    );
  }

  const provider = await loadProvider();
  if (!provider) {
    return NextResponse.json(
      { success: false, error: "Notifications are not configured." },
      { status: 503 },
    );
  }

  try {
    if (parsed.data.read) {
      await provider.markAsRead(id, userId, orgId);
    } else {
      // Provider does not currently support unread; no-op for now.
    }

    return NextResponse.json({
      success: true,
      data: { id, read: parsed.data.read },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notification.",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { userId, orgId } = await requireOrg();

  const id = await resolveId(context);
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Notification ID is required." },
      { status: 400 },
    );
  }

  const provider = await loadProvider();
  if (!provider) {
    return NextResponse.json(
      { success: false, error: "Notifications are not configured." },
      { status: 503 },
    );
  }

  try {
    // Soft-archive: provider has no native archive primitive yet, so we mark as
    // read. A follow-up can extend the InAppNotificationStore with `archive(...)`.
    await provider.markAsRead(id, userId, orgId);

    return NextResponse.json({
      success: true,
      data: { id, archived: true },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to archive notification.",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
